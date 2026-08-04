import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, List
from .config import settings
from .schemas import DagItem, MetricsSummary

logger = logging.getLogger("airflow_client")

class AirflowClient:
    def __init__(self):
        self.base_url = settings.AIRFLOW_BASE_URL.rstrip('/')
        self.user = settings.AIRFLOW_USER
        self.password = settings.AIRFLOW_PASSWORD

    async def _get_auth_params(self, client: httpx.AsyncClient) -> Tuple[Dict[str, str], Any]:
        """
        Returns (headers, auth_tuple).
        Supports Airflow 3+ JWT token auth (/auth/token) as well as Airflow 2.x Basic Auth.
        """
        try:
            root_url = self.base_url.rsplit('/api', 1)[0]
            resp = await client.post(
                f"{root_url}/auth/token",
                json={"username": self.user, "password": self.password},
                timeout=3.0
            )
            if resp.status_code in (200, 201):
                token = resp.json().get("access_token")
                if token:
                    return {"Authorization": f"Bearer {token}"}, None
        except Exception as e:
            logger.debug(f"JWT Token request attempt failed: {e}")

        # Fallback to HTTP Basic Auth (Airflow 2.x)
        return {}, (self.user, self.password)

    async def fetch_dashboard_summary(self) -> Tuple[Dict[str, Any], bool]:
        """
        Fetches DAGs and recent DAG runs in batch calls to avoid looping requests.
        Returns payload and is_mock boolean.
        """
        try:
            async with httpx.AsyncClient(timeout=5.0, verify=settings.AIRFLOW_VERIFY_SSL) as client:
                headers, auth = await self._get_auth_params(client)

                # 1. Fetch DAG list
                dags_resp = await client.get(
                    f"{self.base_url}/dags",
                    headers=headers,
                    auth=auth,
                    params={"limit": 100}
                )
                
                if dags_resp.status_code != 200:
                    logger.warning(f"Airflow API returned {dags_resp.status_code}, attempting fallback/v1 path")
                    # Try v1 fallback if v2 base path fails
                    alt_url = self.base_url.replace('/api/v2', '/api/v1')
                    dags_resp = await client.get(f"{alt_url}/dags", headers=headers, auth=auth, params={"limit": 100})
                
                dags_resp.raise_for_status()
                dags_data = dags_resp.json().get("dags", [])

                # Extract DAG IDs
                dag_ids = [d["dag_id"] for d in dags_data if "dag_id" in d]

                # 2. Batch fetch DAG runs using Airflow 3 ~ (tilde) endpoint with fallbacks
                dag_runs_map = {}
                if dag_ids:
                    try:
                        # Airflow 3 endpoint: GET /dags/~/dagRuns
                        tilde_resp = await client.get(
                            f"{self.base_url}/dags/~/dagRuns",
                            headers=headers,
                            auth=auth,
                            params={"limit": 200, "order_by": "-start_date"}
                        )
                        if tilde_resp.status_code == 200:
                            runs = tilde_resp.json().get("dag_runs", [])
                            for run in runs:
                                d_id = run.get("dag_id")
                                if d_id and d_id not in dag_runs_map:
                                    dag_runs_map[d_id] = run
                        else:
                            # Fallback to Airflow 2 batch POST /dags/dagRuns/list
                            batch_runs_resp = await client.post(
                                f"{self.base_url}/dags/dagRuns/list",
                                headers=headers,
                                auth=auth,
                                json={"dag_ids": dag_ids, "page_limit": 200, "order_by": "-start_date"}
                            )
                            if batch_runs_resp.status_code == 200:
                                runs = batch_runs_resp.json().get("dag_runs", [])
                                for run in runs:
                                    d_id = run.get("dag_id")
                                    if d_id and d_id not in dag_runs_map:
                                        dag_runs_map[d_id] = run
                    except Exception as e:
                        logger.warning(f"Batch DAG runs endpoint failed, proceeding with DAG defaults: {e}")

                # Process results into items and summary metrics
                processed_dags = []
                metrics = {
                    "total_dags": len(dags_data),
                    "active_dags": 0,
                    "paused_dags": 0,
                    "running_dags": 0,
                    "failed_dags": 0,
                    "success_dags": 0,
                    "queued_dags": 0
                }

                for d in dags_data:
                    d_id = d.get("dag_id", "")
                    is_paused = d.get("is_paused", False)
                    tags = [t.get("name", t) if isinstance(t, dict) else str(t) for t in d.get("tags", [])]
                    owners = d.get("owners", [])

                    # Match with latest run
                    latest_run = dag_runs_map.get(d_id, {})
                    state = latest_run.get("state", "none")  # success, running, failed, queued, etc.
                    last_time = (
                        latest_run.get("end_date") or 
                        latest_run.get("start_date") or 
                        latest_run.get("logical_date") or 
                        latest_run.get("execution_date")
                    )

                    if is_paused:
                        metrics["paused_dags"] += 1
                    else:
                        metrics["active_dags"] += 1

                    if state == "running":
                        metrics["running_dags"] += 1
                    elif state == "failed":
                        metrics["failed_dags"] += 1
                    elif state == "success":
                        metrics["success_dags"] += 1
                    elif state == "queued":
                        metrics["queued_dags"] += 1

                    processed_dags.append({
                        "dag_id": d_id,
                        "is_paused": is_paused,
                        "is_active": not is_paused,
                        "owners": owners,
                        "tags": tags,
                        "last_run_state": state,
                        "last_run_time": last_time,
                        "last_run_id": latest_run.get("dag_run_id"),
                        "schedule_interval": str(d.get("schedule_interval") or d.get("timetable_summary") or d.get("timetable_description") or "@daily"),
                        "next_dagrun": d.get("next_dagrun") or d.get("next_dagrun_logical_date")
                    })

                payload = {
                    "metrics": metrics,
                    "dags": processed_dags
                }
                return payload, False

        except Exception as err:
            logger.info(f"Could not connect to live Airflow 3.2 instance ({err}). Using Mock Fallback mode.")
            if settings.USE_MOCK_FALLBACK:
                return self._generate_mock_dashboard_data(), True
            raise err

    async def toggle_dag_pause(self, dag_id: str, is_paused: bool) -> Dict[str, Any]:
        """Proxy PATCH call to Airflow REST API to pause/unpause a DAG."""
        try:
            async with httpx.AsyncClient(timeout=4.0, verify=settings.AIRFLOW_VERIFY_SSL) as client:
                headers, auth = await self._get_auth_params(client)
                resp = await client.patch(
                    f"{self.base_url}/dags/{dag_id}",
                    headers=headers,
                    auth=auth,
                    json={"is_paused": is_paused}
                )
                if resp.status_code in (200, 202):
                    return {"success": True, "message": f"DAG '{dag_id}' {'paused' if is_paused else 'unpaused'} successfully"}
                else:
                    return {"success": False, "message": f"Airflow returned status {resp.status_code}: {resp.text}"}
        except Exception as e:
            if settings.USE_MOCK_FALLBACK:
                return {"success": True, "message": f"[Mock Mode] DAG '{dag_id}' {'paused' if is_paused else 'unpaused'} successfully"}
            return {"success": False, "message": f"Error communicating with Airflow: {str(e)}"}

    async def trigger_dag_run(self, dag_id: str, logical_date: str = None, conf: dict = None) -> Dict[str, Any]:
        """Proxy POST call to Airflow REST API to trigger a DAG run."""
        body = {}
        if conf:
            body["conf"] = conf
        body["logical_date"] = logical_date or datetime.now(timezone.utc).isoformat()

        try:
            async with httpx.AsyncClient(timeout=4.0, verify=settings.AIRFLOW_VERIFY_SSL) as client:
                headers, auth = await self._get_auth_params(client)
                resp = await client.post(
                    f"{self.base_url}/dags/{dag_id}/dagRuns",
                    headers=headers,
                    auth=auth,
                    json=body
                )
                if resp.status_code in (200, 201, 202):
                    return {
                        "success": True,
                        "message": f"Triggered DAG '{dag_id}' run successfully",
                        "details": resp.json() if resp.text else {}
                    }
                else:
                    return {"success": False, "message": f"Airflow returned status {resp.status_code}: {resp.text}"}
        except Exception as e:
            if settings.USE_MOCK_FALLBACK:
                now_str = datetime.now(timezone.utc).isoformat()
                return {
                    "success": True,
                    "message": f"[Mock Mode] Triggered DAG '{dag_id}' run successfully",
                    "details": {"dag_run_id": f"manual_trigger_mock_{now_str}", "logical_date": now_str, "state": "queued"}
                }
            return {"success": False, "message": f"Error communicating with Airflow: {str(e)}"}

    async def stop_dag_run(self, dag_id: str, dag_run_id: str = None) -> Dict[str, Any]:
        """Proxy call to Airflow REST API to cancel/stop a DAG run by setting state to 'failed'."""
        try:
            async with httpx.AsyncClient(timeout=5.0, verify=settings.AIRFLOW_VERIFY_SSL) as client:
                headers, auth = await self._get_auth_params(client)

                target_run_id = dag_run_id
                if not target_run_id:
                    # Fetch latest run for this DAG if run ID was not explicitly supplied
                    runs_resp = await client.get(
                        f"{self.base_url}/dags/{dag_id}/dagRuns",
                        headers=headers,
                        auth=auth,
                        params={"limit": 1, "order_by": "-start_date"}
                    )
                    if runs_resp.status_code == 200:
                        runs_list = runs_resp.json().get("dag_runs", [])
                        if runs_list:
                            target_run_id = runs_list[0].get("dag_run_id")

                if not target_run_id:
                    return {"success": False, "message": f"No active or past run found to stop for DAG '{dag_id}'"}

                # Patch DAG run state to 'failed' to halt execution
                resp = await client.patch(
                    f"{self.base_url}/dags/{dag_id}/dagRuns/{target_run_id}",
                    headers=headers,
                    auth=auth,
                    json={"state": "failed"}
                )

                if resp.status_code in (200, 202):
                    return {
                        "success": True,
                        "message": f"Stopped DAG '{dag_id}' run ({target_run_id}) successfully",
                        "dag_run_id": target_run_id
                    }
                else:
                    return {"success": False, "message": f"Airflow returned status {resp.status_code}: {resp.text}"}
        except Exception as e:
            if settings.USE_MOCK_FALLBACK:
                return {"success": True, "message": f"[Mock Mode] Stopped DAG '{dag_id}' run successfully"}
            return {"success": False, "message": f"Error communicating with Airflow: {str(e)}"}

    async def fetch_dag_run_logs(self, dag_id: str, dag_run_id: str = None) -> Tuple[str, str]:
        """Proxy call to Airflow REST API to retrieve task execution logs or error detail."""
        try:
            async with httpx.AsyncClient(timeout=5.0, verify=settings.AIRFLOW_VERIFY_SSL) as client:
                headers, auth = await self._get_auth_params(client)

                target_run_id = dag_run_id
                if not target_run_id:
                    runs_resp = await client.get(
                        f"{self.base_url}/dags/{dag_id}/dagRuns",
                        headers=headers,
                        auth=auth,
                        params={"limit": 1, "order_by": "-start_date"}
                    )
                    if runs_resp.status_code == 200:
                        runs = runs_resp.json().get("dag_runs", [])
                        if runs:
                            target_run_id = runs[0].get("dag_run_id")

                if target_run_id:
                    # Fetch task instances for this run
                    ti_resp = await client.get(
                        f"{self.base_url}/dags/{dag_id}/dagRuns/{target_run_id}/taskInstances",
                        headers=headers,
                        auth=auth
                    )
                    if ti_resp.status_code == 200:
                        tis = ti_resp.json().get("task_instances", [])
                        failed_ti = next((t for t in tis if t.get("state") in ("failed", "upstream_failed")), None)
                        if failed_ti:
                            task_id = failed_ti.get("task_id")
                            try_num = failed_ti.get("try_number", 1)
                            log_resp = await client.get(
                                f"{self.base_url}/dags/{dag_id}/dagRuns/{target_run_id}/taskInstances/{task_id}/logs/{try_num}",
                                headers=headers,
                                auth=auth
                            )
                            if log_resp.status_code == 200:
                                return log_resp.text, f"Task '{task_id}' failed in try #{try_num}"
        except Exception as e:
            logger.warning(f"Failed to retrieve Airflow logs for {dag_id}: {e}")

        return "", f"DAG '{dag_id}' execution failed"

    def _generate_mock_dashboard_data(self) -> Dict[str, Any]:
        """Generates realistic Airflow 3.2 mock data for testing UI when Airflow is offline."""
        now = datetime.now(timezone.utc)
        
        mock_dags = [
            {
                "dag_id": "etl_customer_analytics_v3",
                "is_paused": False,
                "owners": ["data-eng"],
                "tags": ["core", "sales", "p0"],
                "last_run_state": "running",
                "last_run_time": (now - timedelta(minutes=4)).isoformat(),
                "schedule_interval": "0 * * * *"
            },
            {
                "dag_id": "ml_pipeline_retraining_daily",
                "is_paused": False,
                "owners": ["ml-ops"],
                "tags": ["machine-learning", "daily"],
                "last_run_state": "success",
                "last_run_time": (now - timedelta(minutes=22)).isoformat(),
                "schedule_interval": "0 2 * * *"
            },
            {
                "dag_id": "stripe_payments_reconciliation",
                "is_paused": False,
                "owners": ["finance-tech"],
                "tags": ["finance", "critical"],
                "last_run_state": "failed",
                "last_run_time": (now - timedelta(minutes=14)).isoformat(),
                "schedule_interval": "*/15 * * * *"
            },
            {
                "dag_id": "postgres_db_backup_hourly",
                "is_paused": False,
                "owners": ["infra-team"],
                "tags": ["maintenance", "backup"],
                "last_run_state": "success",
                "last_run_time": (now - timedelta(minutes=45)).isoformat(),
                "schedule_interval": "0 * * * *"
            },
            {
                "dag_id": "warehouse_snowflake_sync",
                "is_paused": False,
                "owners": ["data-eng"],
                "tags": ["snowflake", "bi"],
                "last_run_state": "running",
                "last_run_time": (now - timedelta(minutes=2)).isoformat(),
                "schedule_interval": "*/30 * * * *"
            },
            {
                "dag_id": "user_cohort_segmentation",
                "is_paused": True,
                "owners": ["growth-team"],
                "tags": ["marketing", "weekly"],
                "last_run_state": "success",
                "last_run_time": (now - timedelta(hours=3, minutes=12)).isoformat(),
                "schedule_interval": "@weekly"
            },
            {
                "dag_id": "inventory_kpi_export_service",
                "is_paused": False,
                "owners": ["ops-eng"],
                "tags": ["logistics"],
                "last_run_state": "queued",
                "last_run_time": (now - timedelta(seconds=45)).isoformat(),
                "schedule_interval": "0 8 * * *"
            },
            {
                "dag_id": "legacy_log_cleanup_archiver",
                "is_paused": True,
                "owners": ["infra-team"],
                "tags": ["cleanup", "deprecated"],
                "last_run_state": "none",
                "last_run_time": None,
                "schedule_interval": "@monthly"
            }
        ]

        active = sum(1 for d in mock_dags if not d["is_paused"])
        paused = sum(1 for d in mock_dags if d["is_paused"])
        running = sum(1 for d in mock_dags if d["last_run_state"] == "running")
        failed = sum(1 for d in mock_dags if d["last_run_state"] == "failed")
        success = sum(1 for d in mock_dags if d["last_run_state"] == "success")
        queued = sum(1 for d in mock_dags if d["last_run_state"] == "queued")

        metrics = {
            "total_dags": len(mock_dags),
            "active_dags": active,
            "paused_dags": paused,
            "running_dags": running,
            "failed_dags": failed,
            "success_dags": success,
            "queued_dags": queued
        }

        return {"metrics": metrics, "dags": mock_dags}

airflow_client = AirflowClient()
