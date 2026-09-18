from dataclasses import dataclass


@dataclass
class AllocationEvidence:
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
    task_urgency: str
    task_complexity: str
    reason_codes: list[str]
    human_readable: str


REASON_CODE_MAP = {
    "STRONG_ML_PREDICTION": "Strong ML-predicted SLA success probability",
    "MODERATE_ML_PREDICTION": "Moderate ML-predicted SLA success probability",
    "WEAK_ML_PREDICTION": "Low ML-predicted SLA success probability",
    "REQUIRED_SKILLS_MATCH": "Has all required skills for this task",
    "PARTIAL_SKILLS_MATCH": "Has some but not all required skills",
    "SUFFICIENT_CAPACITY": "Has available capacity for this task",
    "AT_CAPACITY": "Near maximum workload capacity",
    "SLA_FEASIBLE": "Can complete within SLA deadline",
    "SLA_AT_RISK": "SLA deadline may be tight given current workload",
    "LOCATION_MATCH": "Located in the same location as the task",
    "LOCATION_MISMATCH": "Different location from the task",
    "HIGH_PERFORMANCE": "Strong historical SLA compliance track record",
    "MODERATE_PERFORMANCE": "Average historical SLA compliance",
    "CRITICAL_PRIORITY": "Task has Critical priority — highest urgency",
    "HIGH_PRIORITY": "Task has High priority",
    "STABLE_ASSIGNMENT": "Preserving existing stable assignment",
    "BEST_AVAILABLE": "Highest scoring available candidate",
    "WORKLOAD_BALANCED": "Selected to balance team workload",
    "NO_BETTER_CANDIDATE": "No other eligible candidate scores higher",
}


def generate_explanation(
    employee_id: str,
    employee_name: str,
    task_id: str,
    ml_prediction: float,
    skill_match: float,
    workload: float,
    location_match: bool,
    historical_sla_success: float,
    sla_hours: float,
    estimated_effort: float,
    task_urgency: str,
    task_complexity: str,
    is_current_assignment: bool = False,
) -> AllocationEvidence:
    available_capacity = 100.0 - workload
    sla_feasible = estimated_effort <= sla_hours * 0.85

    reason_codes = []

    if ml_prediction >= 0.75:
        reason_codes.append("STRONG_ML_PREDICTION")
    elif ml_prediction >= 0.5:
        reason_codes.append("MODERATE_ML_PREDICTION")
    else:
        reason_codes.append("WEAK_ML_PREDICTION")

    if skill_match >= 0.9:
        reason_codes.append("REQUIRED_SKILLS_MATCH")
    elif skill_match >= 0.5:
        reason_codes.append("PARTIAL_SKILLS_MATCH")

    if available_capacity >= 30:
        reason_codes.append("SUFFICIENT_CAPACITY")
    else:
        reason_codes.append("AT_CAPACITY")

    if sla_feasible:
        reason_codes.append("SLA_FEASIBLE")
    else:
        reason_codes.append("SLA_AT_RISK")

    if location_match:
        reason_codes.append("LOCATION_MATCH")
    else:
        reason_codes.append("LOCATION_MISMATCH")

    if historical_sla_success >= 93:
        reason_codes.append("HIGH_PERFORMANCE")
    elif historical_sla_success >= 85:
        reason_codes.append("MODERATE_PERFORMANCE")

    if task_urgency == "Critical":
        reason_codes.append("CRITICAL_PRIORITY")
    elif task_urgency == "High":
        reason_codes.append("HIGH_PRIORITY")

    if is_current_assignment:
        reason_codes.append("STABLE_ASSIGNMENT")

    if ml_prediction >= 0.7 and skill_match >= 0.8:
        reason_codes.append("BEST_AVAILABLE")

    human_readable = _build_human_readable(
        employee_name=employee_name,
        ml_prediction=ml_prediction,
        skill_match=skill_match,
        workload=workload,
        available_capacity=available_capacity,
        sla_feasible=sla_feasible,
        location_match=location_match,
        historical_sla_success=historical_sla_success,
        task_urgency=task_urgency,
        is_current_assignment=is_current_assignment,
    )

    return AllocationEvidence(
        employee_id=employee_id,
        employee_name=employee_name,
        task_id=task_id,
        prediction_score=round(ml_prediction, 3),
        skill_match=round(skill_match, 3),
        workload=round(workload, 1),
        available_capacity=round(available_capacity, 1),
        sla_feasible=sla_feasible,
        location_match=location_match,
        historical_sla_success=round(historical_sla_success, 1),
        task_urgency=task_urgency,
        task_complexity=task_complexity,
        reason_codes=reason_codes,
        human_readable=human_readable,
    )


def _build_human_readable(
    employee_name: str,
    ml_prediction: float,
    skill_match: float,
    workload: float,
    available_capacity: float,
    sla_feasible: bool,
    location_match: bool,
    historical_sla_success: float,
    task_urgency: str,
    is_current_assignment: bool,
) -> str:
    parts = []

    parts.append(f"{employee_name} was selected")

    if ml_prediction >= 0.75:
        parts.append(f"because the ML model predicts a {ml_prediction:.0%} probability of meeting the SLA")
    elif ml_prediction >= 0.5:
        parts.append(f"because the ML model gives a {ml_prediction:.0%} probability of meeting the SLA")
    else:
        parts.append(f"despite a lower {ml_prediction:.0%} ML prediction, as no better candidate was available")

    if skill_match >= 0.9:
        parts.append("with a strong skill match")
    elif skill_match >= 0.5:
        parts.append("with partial skill coverage")

    parts.append(f"and {available_capacity:.0f}% available capacity")

    if historical_sla_success >= 93:
        parts.append(f"(historical SLA success: {historical_sla_success:.0f}%)")

    if location_match:
        parts.append("at the same location")

    if task_urgency == "Critical":
        parts.append("for this critical-priority task")

    if is_current_assignment:
        parts.append("— preserving a stable existing assignment")

    return " ".join(parts) + "."


def evidence_to_dict(evidence: AllocationEvidence) -> dict:
    return {
        "employee_id": evidence.employee_id,
        "employee_name": evidence.employee_name,
        "task_id": evidence.task_id,
        "prediction_score": evidence.prediction_score,
        "skill_match": evidence.skill_match,
        "workload": evidence.workload,
        "available_capacity": evidence.available_capacity,
        "sla_feasible": evidence.sla_feasible,
        "location_match": evidence.location_match,
        "historical_sla_success": evidence.historical_sla_success,
        "task_urgency": evidence.task_urgency,
        "task_complexity": evidence.task_complexity,
        "reason_codes": evidence.reason_codes,
        "human_readable": evidence.human_readable,
    }
