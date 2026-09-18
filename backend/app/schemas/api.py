from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class SkillOut(BaseModel):
    name: str
    proficiency: int


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_code: str
    name: str
    role: str
    location: str
    availability_status: str
    current_workload: float
    max_capacity: float
    historical_sla_success: float
    active: bool
    skills: list[SkillOut]


class TaskRequiredSkillOut(BaseModel):
    name: str
    minimum_proficiency: int


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    task_type: str
    priority: str
    urgency: int
    sla_hours: float
    estimated_effort_hours: float
    location: str
    status: str
    required_people: int
    complexity: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    suitability_score: Optional[float] = None
    required_skills: list[TaskRequiredSkillOut]


class DashboardStats(BaseModel):
    engineer_count: int
    active_tasks: int
    sla_at_risk: int
    utilization: float
    available_employees: int
    busy_employees: int
    unavailable_employees: int


class ActivityEventOut(BaseModel):
    id: str
    time: str
    message: str
    tone: str


class DecisionStats(BaseModel):
    candidates_evaluated: int
    constraints_checked: int
    sla_risks: int
    decision_seconds: float


class ExplanationOut(BaseModel):
    employee_id: str
    employee_name: str
    task_id: str
    prediction_score: float
    skill_match: float
    workload: float
    available_capacity: float
    sla_feasible: bool
    location_match: bool
    historical_sla_success: float
    reason_codes: list[str]
    human_readable: str


class ReallocationRecord(BaseModel):
    task_id: str
    before_employee_id: Optional[str]
    after_employee_id: str
    after_employee_name: str
    reasons: list[str]
    prediction_score: float
    skill_match: float
    workload: float


class ImpactMetrics(BaseModel):
    assignments_changed: int
    sla_risk_before: int
    sla_risk_after: int
    overloaded_before: int
    overloaded_after: int
    utilization_before: float
    utilization_after: float


class EventResult(BaseModel):
    event: dict
    affected_task_ids: list[str]
    reallocations: list[ReallocationRecord]
    impact: ImpactMetrics
    decision_stats: DecisionStats
    explanations: list[ExplanationOut]


class OptimizationRunOut(BaseModel):
    id: UUID
    trigger_event: str
    created_at: datetime
    objective_value: Optional[float]
    tasks_changed: int
    sla_risk_before: int
    sla_risk_after: int
