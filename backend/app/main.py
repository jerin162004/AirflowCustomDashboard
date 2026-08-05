import time
import logging
from fastapi import FastAPI, HTTPException, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

from .config import settings
from .cache import dashboard_cache
from .airflow_client import airflow_client
from .ai_service import ai_service
from .schemas import (
    DashboardSummaryResponse, 
    PauseToggleRequest, 
    TriggerDagRequest,
    StopDagRequest,
    DiagnoseRequest,
    DiagnosisChatRequest,
    ChatOpsRequest,
    ChatOpsResponse,
    ActionResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("airflow_dashboard_backend")

app = FastAPI(
    title="Airflow 3.2 Executive Dashboard API Proxy",
    description="High-performance, 15s cached middleware backend for Apache Airflow 3.2 REST API",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .email_service import email_service

async def _check_and_send_failure_emails(dags_list: list):
    if not settings.ENABLE_EMAIL_ALERTS:
        return
    for dag in dags_list:
        state = (dag.get("last_run_state") or "").lower()
        if state in ("failed", "upstream_failed"):
            dag_id = dag.get("dag_id")
            dag_run_id = dag.get("last_run_id")
            if not email_service.is_already_notified(dag_id, dag_run_id):
                logs_text, error_detail = await airflow_client.fetch_dag_run_logs(dag_id, dag_run_id)
                diagnosis = await ai_service.diagnose_failure_async(dag_id, dag_run_id, logs_text, error_detail)
                await email_service.send_failure_alert_email_async(dag_id, dag_run_id, diagnosis)

@app.get("/api/health", summary="Health Check")
async def health_check():
    return {
        "status": "healthy",
        "service": "Airflow 3.2 Dashboard Caching Proxy",
        "airflow_base_url": settings.AIRFLOW_BASE_URL,
        "cache_ttl_seconds": settings.CACHE_TTL_SECONDS,
        "email_alerts_enabled": settings.ENABLE_EMAIL_ALERTS
    }

@app.get("/api/dashboard-summary", response_model=DashboardSummaryResponse, summary="Get Dashboard Summary (15s Cached)")
async def get_dashboard_summary():
    """
    CRUCIAL ARCHITECTURE RULE:
    Cached middleware route fetching aggregated metrics and DAG state from Airflow 3.2.
    Uses an in-memory cache with 15-second TTL to shield Airflow REST API from concurrent browser polling spam.
    """
    try:
        (data, is_mock), is_cached, cached_at, remaining_ttl = await dashboard_cache.get_or_fetch(
            airflow_client.fetch_dashboard_summary
        )

        # Trigger background email alert check if alerts are enabled
        if settings.ENABLE_EMAIL_ALERTS:
            import asyncio
            asyncio.create_task(_check_and_send_failure_emails(data.get("dags", [])))

        return DashboardSummaryResponse(
            metrics=data["metrics"],
            dags=data["dags"],
            cached_at=cached_at,
            expires_in_seconds=remaining_ttl,
            is_cached=is_cached,
            is_mock=is_mock
        )
    except Exception as e:
        logger.error(f"Error serving dashboard summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve dashboard summary: {str(e)}")

@app.patch("/api/dags/{dag_id}/pause", response_model=ActionResponse, summary="Toggle DAG Pause/Unpause")
async def toggle_pause(
    dag_id: str = Path(..., description="The DAG identifier"),
    req: PauseToggleRequest = Body(...)
):
    """
    Pause or unpause a DAG via proxy call to Airflow 3.2.
    Invalidates the 15s backend cache so the UI gets fresh state immediately.
    """
    res = await airflow_client.toggle_dag_pause(dag_id, req.is_paused)
    if res.get("success"):
        dashboard_cache.invalidate()
        return ActionResponse(success=True, message=res["message"], dag_id=dag_id)
    else:
        raise HTTPException(status_code=400, detail=res.get("message", "Failed to update DAG pause state"))

@app.post("/api/dags/{dag_id}/trigger", response_model=ActionResponse, summary="Trigger DAG Run")
async def trigger_dag(
    dag_id: str = Path(..., description="The DAG identifier"),
    req: TriggerDagRequest = Body(default_factory=TriggerDagRequest)
):
    """
    Trigger a new DAG run via proxy call to Airflow 3.2.
    Invalidates the 15s backend cache so the UI updates immediately.
    """
    res = await airflow_client.trigger_dag_run(dag_id, req.logical_date, req.conf)
    if res.get("success"):
        dashboard_cache.invalidate()
        return ActionResponse(
            success=True,
            message=res["message"],
            dag_id=dag_id,
            details=res.get("details")
        )
    else:
        raise HTTPException(status_code=400, detail=res.get("message", "Failed to trigger DAG run"))

@app.post("/api/dags/{dag_id}/stop", response_model=ActionResponse, summary="Stop / Cancel DAG Run")
async def stop_dag(
    dag_id: str = Path(..., description="The DAG identifier"),
    req: StopDagRequest = Body(default_factory=StopDagRequest)
):
    """
    Stop or cancel an active/latest DAG run via proxy call to Airflow 3.2.
    Invalidates the 15s backend cache so the UI updates immediately.
    """
    res = await airflow_client.stop_dag_run(dag_id, req.dag_run_id)
    if res.get("success"):
        dashboard_cache.invalidate()
        return ActionResponse(
            success=True,
            message=res["message"],
            dag_id=dag_id,
            details={"dag_run_id": res.get("dag_run_id")}
        )
    else:
        raise HTTPException(status_code=400, detail=res.get("message", "Failed to stop DAG run"))

@app.post("/api/dags/{dag_id}/diagnose", summary="Automated AI Error & Log Diagnosis")
async def diagnose_failure(
    dag_id: str = Path(..., description="The DAG identifier"),
    req: DiagnoseRequest = Body(default_factory=DiagnoseRequest)
):
    """
    Retrieves task execution logs for a failed DAG run and uses AI Diagnostic engine
    to extract root cause, human explanation, and step-by-step remediation actions.
    """
    logs_text, error_detail = await airflow_client.fetch_dag_run_logs(dag_id, req.dag_run_id)
    diagnosis = ai_service.diagnose_failure(dag_id, req.dag_run_id, logs_text, error_detail)
    return diagnosis

@app.post("/api/dags/{dag_id}/chat-followup", summary="Interactive AI Diagnosis Follow-Up Chat")
async def process_diagnosis_chat(
    dag_id: str = Path(..., description="The DAG identifier"),
    req: DiagnosisChatRequest = Body(...)
):
    """
    Handles follow-up troubleshooting questions inside the AI Diagnosis Modal.
    Passes error log context to Gemini AI LLM engine for SQL generation or code fixes.
    """
    logs_text, _ = await airflow_client.fetch_dag_run_logs(dag_id, req.dag_run_id)
    chat_res = await ai_service.process_diagnosis_followup_chat(
        dag_id=dag_id,
        dag_run_id=req.dag_run_id,
        prompt=req.prompt,
        logs=logs_text,
        history=req.history
    )
    return chat_res

@app.post("/api/chatops/command", response_model=ChatOpsResponse, summary="Natural Language ChatOps Command Assistant")
async def process_chatops_command(
    req: ChatOpsRequest = Body(...)
):
    """
    Processes natural language prompts into executable dashboard actions (filter, trigger, stop, search).
    """
    (data, _), _, _, _ = await dashboard_cache.get_or_fetch(airflow_client.fetch_dashboard_summary)
    dags_list = data.get("dags", [])

    parsed = ai_service.parse_chatops_command(req.prompt, dags_list)
    return ChatOpsResponse(
        success=True,
        action=parsed["action"],
        message=parsed["message"],
        target_dag_id=parsed.get("target_dag_id"),
        details=parsed.get("details")
    )

@app.get("/api/ai/health-summary", summary="AI Executive System Health Report")
async def get_ai_health_summary():
    """
    Generates an executive-level AI health summary and risk assessment for cluster DAG workflows.
    """
    (data, _), _, _, _ = await dashboard_cache.get_or_fetch(airflow_client.fetch_dashboard_summary)
    metrics = data.get("metrics", {})
    dags_list = data.get("dags", [])
    report = ai_service.generate_health_summary(metrics, dags_list)
    return report

@app.post("/api/cache/clear", summary="Force Invalidate Backend Cache")
async def clear_cache():
    dashboard_cache.invalidate()
    return {"success": True, "message": "Backend cache invalidated successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
