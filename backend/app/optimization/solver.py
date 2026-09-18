from dataclasses import dataclass, field
from ortools.sat.python import cp_model


@dataclass
class ObjectiveWeights:
    ml_prediction: float = 0.30
    skill_match: float = 0.20
    urgency: float = 0.15
    workload_balance: float = 0.10
    sla_risk: float = 0.10
    location_match: float = 0.05
    historical_performance: float = 0.05
    reassignment_penalty: float = 0.05


DEFAULT_WEIGHTS = ObjectiveWeights()


@dataclass
class CandidateInput:
    employee_id: str
    employee_name: str
    task_id: str
    ml_prediction: float
    skill_match: float
    workload: float
    availability: str
    location_match: bool
    historical_sla_success: float
    urgency: int
    is_current_assignment: bool


@dataclass
class SolverResult:
    assignments: list[dict]
    objective_value: float
    solve_time_seconds: float
    status: str
    candidates_evaluated: int
    constraints_checked: int


def solve_global_allocation(
    candidates: list[CandidateInput],
    weights: ObjectiveWeights = DEFAULT_WEIGHTS,
    max_time_seconds: float = 5.0,
) -> SolverResult:
    if not candidates:
        return SolverResult(
            assignments=[], objective_value=0.0, solve_time_seconds=0.0,
            status="no_candidates", candidates_evaluated=0, constraints_checked=0,
        )

    model = cp_model.CpModel()

    employee_ids = list({c.employee_id for c in candidates})
    task_ids = list({c.task_id for c in candidates})

    emp_idx = {eid: i for i, eid in enumerate(employee_ids)}
    task_idx = {tid: i for i, tid in enumerate(task_ids)}

    candidate_map = {}
    for c in candidates:
        key = (c.employee_id, c.task_id)
        candidate_map[key] = c

    x = {}
    for c in candidates:
        var = model.new_bool_var(f"x_{emp_idx[c.employee_id]}_{task_idx[c.task_id]}")
        x[(c.employee_id, c.task_id)] = var

    for tid in task_ids:
        task_vars = [x[(eid, tid)] for eid in employee_ids if (eid, tid) in x]
        if task_vars:
            model.add_exactly_one(task_vars)

    for eid in employee_ids:
        emp_vars = [x[(eid, tid)] for tid in task_ids if (eid, tid) in x]
        if emp_vars:
            model.add(sum(emp_vars) <= 3)

    for c in candidates:
        if c.availability == "Unavailable":
            model.add(x[(c.employee_id, c.task_id)] == 0)

    objective_terms = []
    candidates_evaluated = 0
    constraints_checked = 0

    for c in candidates:
        var = x[(c.employee_id, c.task_id)]

        ml_score = int(c.ml_prediction * 1000)
        skill_score = int(c.skill_match * 1000)
        urgency_score = int(c.urgency * 100)
        workload_penalty = int(c.workload * 10)
        perf_score = int(c.historical_sla_success * 10)
        reassign_bonus = 500 if c.is_current_assignment else 0
        loc_bonus = 300 if c.location_match else 0

        weighted = (
            ml_score * weights.ml_prediction
            + skill_score * weights.skill_match
            + urgency_score * weights.urgency
            + (1000 - workload_penalty) * weights.workload_balance
            + perf_score * weights.historical_performance
            + loc_bonus * weights.location_match
            + reassign_bonus * weights.reassignment_penalty
        )

        objective_terms.append((var, int(weighted)))
        candidates_evaluated += 1
        constraints_checked += 3

    model.maximize(sum(var * coeff for var, coeff in objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_time_seconds
    solver.parameters.num_workers = 1

    status_code = solver.solve(model)

    status_map = {
        cp_model.OPTIMAL: "optimal",
        cp_model.FEASIBLE: "feasible",
        cp_model.INFEASIBLE: "infeasible",
        cp_model.MODEL_INVALID: "model_invalid",
        cp_model.UNKNOWN: "unknown",
    }
    status_str = status_map.get(status_code, "unknown")

    assignments = []
    if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for c in candidates:
            if solver.value(x[(c.employee_id, c.task_id)]) == 1:
                assignments.append({
                    "employee_id": c.employee_id,
                    "employee_name": c.employee_name,
                    "task_id": c.task_id,
                    "ml_prediction": c.ml_prediction,
                    "skill_match": c.skill_match,
                    "workload": c.workload,
                    "location_match": c.location_match,
                    "is_current_assignment": c.is_current_assignment,
                })

    return SolverResult(
        assignments=assignments,
        objective_value=solver.objective_value if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0.0,
        solve_time_seconds=round(solver.wall_time, 3) if hasattr(solver, 'wall_time') else 0.0,
        status=status_str,
        candidates_evaluated=candidates_evaluated,
        constraints_checked=constraints_checked,
    )
