import os
import sys
import pickle
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix,
)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.ml.features import export_training_data, build_feature_columns


def train_model(output_path: str = "./models/lightgbm_model.pkl"):
    print("Loading training data from database...")
    db = SessionLocal()
    df = export_training_data(db)
    db.close()

    print(f"Dataset: {len(df)} rows")
    print(f"SLA met: {df['sla_met'].sum()} ({df['sla_met'].mean()*100:.1f}%)")
    print(f"SLA breached: {len(df) - df['sla_met'].sum()} ({(1-df['sla_met'].mean())*100:.1f}%)")

    feature_cols = build_feature_columns()
    X = df[feature_cols]
    y = df["sla_met"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\nTrain: {len(X_train)} rows, Test: {len(X_test)} rows")

    train_data = lgb.Dataset(X_train, label=y_train)
    test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "boosting_type": "gbdt",
        "num_leaves": 31,
        "learning_rate": 0.05,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "verbose": -1,
        "seed": 42,
    }

    callbacks = [
        lgb.log_evaluation(period=50),
        lgb.early_stopping(stopping_rounds=20),
    ]

    print("\nTraining LightGBM model...")
    model = lgb.train(
        params,
        train_data,
        num_boost_round=200,
        valid_sets=[test_data],
        callbacks=callbacks,
    )

    y_pred_proba = model.predict(X_test)
    y_pred = (y_pred_proba >= 0.5).astype(int)

    auc = roc_auc_score(y_test, y_pred_proba)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    print(f"\n=== MODEL METRICS ===")
    print(f"ROC-AUC:   {auc:.4f}")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["SLA Breached", "SLA Met"]))

    feature_importance = pd.DataFrame({
        "feature": feature_cols,
        "importance": model.feature_importance(importance_type="gain"),
    }).sort_values("importance", ascending=False)
    print("Feature Importance (gain):")
    for _, row in feature_importance.iterrows():
        print(f"  {row['feature']:30s} {row['importance']:10.1f}")

    artifact = {
        "model": model,
        "feature_cols": feature_cols,
        "metrics": {
            "roc_auc": round(auc, 4),
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "confusion_matrix": cm.tolist(),
            "train_size": len(X_train),
            "test_size": len(X_test),
        },
        "feature_importance": feature_importance.to_dict("records"),
    }

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    with open(output_path, "wb") as f:
        pickle.dump(artifact, f)

    print(f"\nModel saved to: {output_path}")
    return artifact


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "./models/lightgbm_model.pkl"
    train_model(output)
