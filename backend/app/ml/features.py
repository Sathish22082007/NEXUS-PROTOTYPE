import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.models.models import HistoricalAssignment, Employee, TaskComplexity


COMPLEXITY_MAP = {"Low": 0, "Medium": 1, "High": 2}

TASK_TYPE_LIST = [
    "Incident Response", "Feature Deployment", "Bug Fix",
    "Infra Migration", "Security Patch", "Performance Tuning",
    "Customer Escalation", "Data Pipeline", "API Integration",
    "Monitoring Setup",
]
TASK_TYPE_MAP = {t: i for i, t in enumerate(TASK_TYPE_LIST)}


def build_feature_columns() -> list[str]:
    return [
        "skill_match",
        "workload_at_assignment",
        "location_match",
        "sla_hours",
        "estimated_effort",
        "complexity_encoded",
        "task_type_encoded",
        "employee_sla_success",
    ]


def export_training_data(db: Session) -> pd.DataFrame:
    records = db.query(HistoricalAssignment).all()
    rows = []
    for r in records:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        emp_sla = emp.historical_sla_success if emp else 90.0
        rows.append({
            "skill_match": r.skill_match,
            "workload_at_assignment": r.workload_at_assignment / 100.0,
            "location_match": float(r.location_match),
            "sla_hours": r.sla_hours,
            "estimated_effort": r.estimated_effort,
            "complexity_encoded": COMPLEXITY_MAP.get(r.task_complexity.value, 1),
            "task_type_encoded": TASK_TYPE_MAP.get(r.task_type, 5),
            "employee_sla_success": emp_sla / 100.0,
            "sla_met": int(r.sla_met),
        })
    return pd.DataFrame(rows)


def build_single_features(
    skill_match: float,
    workload: float,
    location_match: bool,
    sla_hours: float,
    estimated_effort: float,
    complexity: str,
    task_type: str,
    employee_sla_success: float,
) -> dict:
    return {
        "skill_match": skill_match,
        "workload_at_assignment": workload / 100.0,
        "location_match": float(location_match),
        "sla_hours": sla_hours,
        "estimated_effort": estimated_effort,
        "complexity_encoded": COMPLEXITY_MAP.get(complexity, 1),
        "task_type_encoded": TASK_TYPE_MAP.get(task_type, 5),
        "employee_sla_success": employee_sla_success / 100.0,
    }
