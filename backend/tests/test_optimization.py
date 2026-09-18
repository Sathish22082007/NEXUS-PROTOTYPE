from app.optimization.solver import solve_global_allocation, CandidateInput, ObjectiveWeights


def _make_candidates():
    return [
        CandidateInput(
            employee_id="E1", employee_name="Alice", task_id="T1",
            ml_prediction=0.9, skill_match=1.0, workload=30.0,
            availability="Available", location_match=True,
            historical_sla_success=95.0, urgency=10, is_current_assignment=False,
        ),
        CandidateInput(
            employee_id="E2", employee_name="Bob", task_id="T1",
            ml_prediction=0.7, skill_match=0.8, workload=50.0,
            availability="Available", location_match=False,
            historical_sla_success=88.0, urgency=10, is_current_assignment=False,
        ),
        CandidateInput(
            employee_id="E1", employee_name="Alice", task_id="T2",
            ml_prediction=0.8, skill_match=0.9, workload=30.0,
            availability="Available", location_match=True,
            historical_sla_success=95.0, urgency=7, is_current_assignment=False,
        ),
    ]


def test_solver_finds_solution():
    candidates = _make_candidates()
    result = solve_global_allocation(candidates)
    assert result.status in ("optimal", "feasible")
    assert len(result.assignments) > 0


def test_each_task_assigned_once():
    candidates = _make_candidates()
    result = solve_global_allocation(candidates)
    assigned_tasks = [a["task_id"] for a in result.assignments]
    assert len(assigned_tasks) == len(set(assigned_tasks))


def test_unavailable_employee_not_assigned():
    candidates = [
        CandidateInput(
            employee_id="E1", employee_name="Alice", task_id="T1",
            ml_prediction=0.9, skill_match=1.0, workload=30.0,
            availability="Unavailable", location_match=True,
            historical_sla_success=95.0, urgency=10, is_current_assignment=False,
        ),
        CandidateInput(
            employee_id="E2", employee_name="Bob", task_id="T1",
            ml_prediction=0.7, skill_match=0.8, workload=50.0,
            availability="Available", location_match=False,
            historical_sla_success=88.0, urgency=10, is_current_assignment=False,
        ),
    ]
    result = solve_global_allocation(candidates)
    for a in result.assignments:
        assert a["employee_id"] != "E1"


def test_no_candidates_returns_empty():
    result = solve_global_allocation([])
    assert result.status == "no_candidates"
    assert len(result.assignments) == 0


def test_objective_value_positive():
    candidates = _make_candidates()
    result = solve_global_allocation(candidates)
    if result.status in ("optimal", "feasible"):
        assert result.objective_value > 0


def test_higher_ml_prediction_preferred():
    candidates = [
        CandidateInput(
            employee_id="E1", employee_name="Best", task_id="T1",
            ml_prediction=0.95, skill_match=1.0, workload=20.0,
            availability="Available", location_match=True,
            historical_sla_success=98.0, urgency=10, is_current_assignment=False,
        ),
        CandidateInput(
            employee_id="E2", employee_name="Worse", task_id="T1",
            ml_prediction=0.4, skill_match=0.5, workload=80.0,
            availability="Available", location_match=False,
            historical_sla_success=75.0, urgency=10, is_current_assignment=False,
        ),
    ]
    result = solve_global_allocation(candidates)
    assert any(a["employee_id"] == "E1" for a in result.assignments)


def test_custom_weights():
    candidates = _make_candidates()
    weights = ObjectiveWeights(ml_prediction=0.5, skill_match=0.3, urgency=0.1, workload_balance=0.05, sla_risk=0.02, location_match=0.01, historical_performance=0.01, reassignment_penalty=0.01)
    result = solve_global_allocation(candidates, weights=weights)
    assert result.status in ("optimal", "feasible")


def test_candidates_evaluated_count():
    candidates = _make_candidates()
    result = solve_global_allocation(candidates)
    assert result.candidates_evaluated == len(candidates)


def test_constraints_checked_count():
    candidates = _make_candidates()
    result = solve_global_allocation(candidates)
    assert result.constraints_checked == len(candidates) * 3
