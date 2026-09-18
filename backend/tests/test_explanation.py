from app.explanation.explainer import generate_explanation, evidence_to_dict, REASON_CODE_MAP


def test_generate_explanation_returns_evidence():
    evidence = generate_explanation(
        employee_id="E1",
        employee_name="Priya Sharma",
        task_id="TSK-221",
        ml_prediction=0.88,
        skill_match=1.0,
        workload=41.0,
        location_match=True,
        historical_sla_success=96.0,
        sla_hours=4.0,
        estimated_effort=2.2,
        task_urgency="High",
        task_complexity="Medium",
    )
    assert evidence.employee_id == "E1"
    assert evidence.employee_name == "Priya Sharma"
    assert evidence.task_id == "TSK-221"
    assert evidence.prediction_score == 0.88
    assert evidence.skill_match == 1.0


def test_reason_codes_include_strong_ml():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.85, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=95.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="Critical", task_complexity="High",
    )
    assert "STRONG_ML_PREDICTION" in evidence.reason_codes


def test_reason_codes_include_moderate_ml():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.6, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=95.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "MODERATE_ML_PREDICTION" in evidence.reason_codes


def test_reason_codes_include_weak_ml():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.3, skill_match=0.5, workload=90.0,
        location_match=False, historical_sla_success=80.0,
        sla_hours=2.0, estimated_effort=3.4,
        task_urgency="Low", task_complexity="High",
    )
    assert "WEAK_ML_PREDICTION" in evidence.reason_codes


def test_reason_codes_skills_match():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.8, skill_match=1.0, workload=50.0,
        location_match=True, historical_sla_success=90.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "REQUIRED_SKILLS_MATCH" in evidence.reason_codes


def test_reason_codes_partial_skills():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.6, skill_match=0.6, workload=50.0,
        location_match=True, historical_sla_success=90.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "PARTIAL_SKILLS_MATCH" in evidence.reason_codes


def test_reason_codes_capacity():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.8, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=90.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "SUFFICIENT_CAPACITY" in evidence.reason_codes


def test_reason_codes_at_capacity():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.6, skill_match=0.8, workload=80.0,
        location_match=True, historical_sla_success=90.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "AT_CAPACITY" in evidence.reason_codes


def test_reason_codes_sla_feasible():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.8, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=90.0,
        sla_hours=8.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "SLA_FEASIBLE" in evidence.reason_codes


def test_reason_codes_location():
    match = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.8, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=90.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "LOCATION_MATCH" in match.reason_codes

    mismatch = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.8, skill_match=1.0, workload=30.0,
        location_match=False, historical_sla_success=90.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "LOCATION_MISMATCH" in mismatch.reason_codes


def test_human_readable_contains_name():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Priya Sharma", task_id="T1",
        ml_prediction=0.85, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=95.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="Critical", task_complexity="Medium",
    )
    assert "Priya Sharma" in evidence.human_readable


def test_human_readable_contains_prediction():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.85, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=95.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    assert "85%" in evidence.human_readable


def test_evidence_to_dict():
    evidence = generate_explanation(
        employee_id="E1", employee_name="Alice", task_id="T1",
        ml_prediction=0.8, skill_match=1.0, workload=30.0,
        location_match=True, historical_sla_success=90.0,
        sla_hours=4.0, estimated_effort=2.2,
        task_urgency="High", task_complexity="Medium",
    )
    d = evidence_to_dict(evidence)
    assert d["employee_id"] == "E1"
    assert "reason_codes" in d
    assert "human_readable" in d
    assert isinstance(d["reason_codes"], list)


def test_all_reason_codes_valid():
    for code in REASON_CODE_MAP:
        assert isinstance(code, str)
        assert len(code) > 0
