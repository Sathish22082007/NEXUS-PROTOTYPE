import os
import pickle
import numpy as np
import pandas as pd
from app.ml.features import build_single_features, build_feature_columns

_model_cache = None
_artifact_cache = None


def load_model(model_path: str = None):
    global _model_cache, _artifact_cache

    if _model_cache is not None and model_path is None:
        return _model_cache, _artifact_cache

    if model_path is None:
        model_path = os.environ.get("MODEL_PATH", "./models/lightgbm_model.pkl")

    if not os.path.exists(model_path):
        return None, None

    with open(model_path, "rb") as f:
        artifact = pickle.load(f)

    _model_cache = artifact["model"]
    _artifact_cache = artifact
    return _model_cache, _artifact_cache


def predict_sla_probability(
    skill_match: float,
    workload: float,
    location_match: bool,
    sla_hours: float,
    estimated_effort: float,
    complexity: str,
    task_type: str,
    employee_sla_success: float,
    model_path: str = None,
) -> float:
    model, _ = load_model(model_path)
    if model is None:
        score = skill_match * 0.4 + (100 - workload) / 100 * 0.25 + employee_sla_success / 100 * 0.2 + (1.0 if location_match else 0.5) * 0.15
        return round(score, 3)

    features = build_single_features(
        skill_match=skill_match,
        workload=workload,
        location_match=location_match,
        sla_hours=sla_hours,
        estimated_effort=estimated_effort,
        complexity=complexity,
        task_type=task_type,
        employee_sla_success=employee_sla_success,
    )

    feature_cols = build_feature_columns()
    X = pd.DataFrame([[features[col] for col in feature_cols]], columns=feature_cols)

    prob = model.predict(X)[0]
    return round(float(prob), 3)


def get_model_metrics(model_path: str = None) -> dict:
    _, artifact = load_model(model_path)
    if artifact is None:
        return {"loaded": False, "message": "No model artifact found"}
    return {"loaded": True, "metrics": artifact["metrics"], "feature_importance": artifact.get("feature_importance", [])}


def clear_cache():
    global _model_cache, _artifact_cache
    _model_cache = None
    _artifact_cache = None
