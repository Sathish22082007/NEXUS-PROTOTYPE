from app.ml.predict import predict_sla_probability, get_model_metrics, load_model
from app.ml.features import build_single_features, build_feature_columns, COMPLEXITY_MAP, TASK_TYPE_MAP


def test_model_loads():
    model, artifact = load_model()
    assert model is not None
    assert artifact is not None
    assert "model" in artifact
    assert "feature_cols" in artifact
    assert "metrics" in artifact


def test_model_metrics():
    metrics = get_model_metrics()
    assert metrics["loaded"] is True
    assert "roc_auc" in metrics["metrics"]
    assert "accuracy" in metrics["metrics"]
    assert "f1" in metrics["metrics"]
    assert 0 < metrics["metrics"]["roc_auc"] <= 1.0
    assert 0 < metrics["metrics"]["accuracy"] <= 1.0


def test_prediction_returns_valid_probability():
    prob = predict_sla_probability(
        skill_match=0.9,
        workload=40.0,
        location_match=True,
        sla_hours=4.0,
        estimated_effort=2.2,
        complexity="Medium",
        task_type="Feature Deployment",
        employee_sla_success=95.0,
    )
    assert 0.0 <= prob <= 1.0


def test_prediction_high_skill_better_than_low():
    high = predict_sla_probability(
        skill_match=1.0, workload=30.0, location_match=True,
        sla_hours=4.0, estimated_effort=2.2, complexity="Medium",
        task_type="Bug Fix", employee_sla_success=95.0,
    )
    low = predict_sla_probability(
        skill_match=0.3, workload=30.0, location_match=True,
        sla_hours=4.0, estimated_effort=2.2, complexity="Medium",
        task_type="Bug Fix", employee_sla_success=95.0,
    )
    assert high >= low


def test_prediction_low_workload_better():
    low_load = predict_sla_probability(
        skill_match=1.0, workload=10.0, location_match=True,
        sla_hours=8.0, estimated_effort=1.3, complexity="Low",
        task_type="Bug Fix", employee_sla_success=95.0,
    )
    high_load = predict_sla_probability(
        skill_match=1.0, workload=95.0, location_match=True,
        sla_hours=8.0, estimated_effort=1.3, complexity="Low",
        task_type="Bug Fix", employee_sla_success=95.0,
    )
    assert low_load >= high_load


def test_prediction_high_performance_better():
    prob = predict_sla_probability(
        skill_match=1.0, workload=40.0, location_match=True,
        sla_hours=8.0, estimated_effort=1.3, complexity="Low",
        task_type="Bug Fix", employee_sla_success=99.0,
    )
    assert 0.0 <= prob <= 1.0
    assert prob > 0.5


def test_prediction_fallback_without_model():
    prob = predict_sla_probability(
        skill_match=0.8, workload=50.0, location_match=True,
        sla_hours=4.0, estimated_effort=2.2, complexity="Medium",
        task_type="Bug Fix", employee_sla_success=90.0,
        model_path="/nonexistent/path.pkl",
    )
    assert 0.0 <= prob <= 1.0


def test_feature_columns():
    cols = build_feature_columns()
    assert len(cols) == 8
    assert "skill_match" in cols
    assert "workload_at_assignment" in cols


def test_feature_engineering():
    features = build_single_features(
        skill_match=0.8,
        workload=50.0,
        location_match=True,
        sla_hours=4.0,
        estimated_effort=2.2,
        complexity="Medium",
        task_type="Bug Fix",
        employee_sla_success=90.0,
    )
    assert features["skill_match"] == 0.8
    assert features["workload_at_assignment"] == 0.5
    assert features["location_match"] == 1.0
    assert features["complexity_encoded"] == COMPLEXITY_MAP["Medium"]
    assert features["task_type_encoded"] == TASK_TYPE_MAP["Bug Fix"]
