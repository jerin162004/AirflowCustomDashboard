from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class DagItem(BaseModel):
    dag_id: str
    is_paused: bool
    is_active: bool = True
    owners: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    last_run_state: Optional[str] = "none"  # success, running, failed, queued, none
    last_run_time: Optional[str] = None      # ISO timestamp or logical_date/start_date
    last_run_id: Optional[str] = None
    schedule_interval: Optional[str] = "@daily"
    next_dagrun: Optional[str] = None

class MetricsSummary(BaseModel):
    total_dags: int = 0
    active_dags: int = 0
    paused_dags: int = 0
    running_dags: int = 0
    failed_dags: int = 0
    success_dags: int = 0
    queued_dags: int = 0

class DashboardSummaryResponse(BaseModel):
    metrics: MetricsSummary
    dags: List[DagItem]
    cached_at: float
    expires_in_seconds: float
    is_cached: bool
    is_mock: bool = False

class PauseToggleRequest(BaseModel):
    is_paused: bool

class TriggerDagRequest(BaseModel):
    logical_date: Optional[str] = None
    conf: Optional[Dict[str, Any]] = None

class StopDagRequest(BaseModel):
    dag_run_id: Optional[str] = None

class ActionResponse(BaseModel):
    success: bool
    message: str
    dag_id: str
    details: Optional[Dict[str, Any]] = None

class DiagnoseRequest(BaseModel):
    dag_run_id: Optional[str] = None

class ChatOpsRequest(BaseModel):
    prompt: str

class ChatOpsResponse(BaseModel):
    success: bool
    action: str
    message: str
    target_dag_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class DiagnosisChatRequest(BaseModel):
    dag_run_id: Optional[str] = None
    prompt: str
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
