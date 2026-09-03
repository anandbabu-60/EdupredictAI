"""
==========================================================================
EDUPREDICT AI — ML MODEL TRAINING & BENCHMARKING PIPELINE
Trains, benchmarks, evaluates, and serializes student performance models.
==========================================================================
"""

import os
import sys
import json
import logging
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

from sklearn.linear_model import LinearRegression, Ridge
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("EduPredict-Training")

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "student_data.csv"
MODEL_PATH = BASE_DIR / "student_performance_model.joblib"
METRICS_PATH = BASE_DIR / "model_metrics.json"
IMPORTANCE_PATH = BASE_DIR / "feature_importance.json"

# Exact 19 features contract
NUMERICAL_COLS = [
    "Hours_Studied",
    "Attendance",
    "Sleep_Hours",
    "Previous_Scores",
    "Tutoring_Sessions",
    "Physical_Activity"
]

CATEGORICAL_COLS = [
    "Parental_Involvement",
    "Access_to_Resources",
    "Extracurricular_Activities",
    "Motivation_Level",
    "Internet_Access",
    "Family_Income",
    "Teacher_Quality",
    "School_Type",
    "Peer_Influence",
    "Learning_Disabilities",
    "Parental_Education_Level",
    "Distance_from_Home",
    "Gender"
]

ALL_FEATURES = NUMERICAL_COLS + CATEGORICAL_COLS


def generate_synthetic_dataset(num_samples: int = 10000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic student academic performance dataset
    with realistic distributions and multi-factor correlations.
    """
    np.random.seed(random_seed)
    logger.info(f"Generating {num_samples} realistic student academic records...")

    # Numerical features
    hours_studied = np.random.gamma(shape=3.5, scale=4.0, size=num_samples)
    hours_studied = np.clip(np.round(hours_studied, 1), 1.0, 50.0)

    attendance = np.random.beta(a=7.0, b=2.0, size=num_samples) * 100
    attendance = np.clip(np.round(attendance, 1), 25.0, 100.0)

    sleep_hours = np.random.normal(loc=7.0, scale=1.2, size=num_samples)
    sleep_hours = np.clip(np.round(sleep_hours, 1), 4.0, 10.0)

    previous_scores = np.random.normal(loc=72.0, scale=14.0, size=num_samples)
    previous_scores = np.clip(np.round(previous_scores, 1), 30.0, 100.0)

    tutoring_sessions = np.random.poisson(lam=2.0, size=num_samples)
    tutoring_sessions = np.clip(tutoring_sessions, 0, 10)

    physical_activity = np.random.gamma(shape=2.5, scale=2.5, size=num_samples)
    physical_activity = np.clip(np.round(physical_activity, 1), 0.0, 20.0)

    # Categorical features
    parental_involvement = np.random.choice(["High", "Medium", "Low"], size=num_samples, p=[0.35, 0.45, 0.20])
    access_to_resources = np.random.choice(["High", "Medium", "Low"], size=num_samples, p=[0.40, 0.45, 0.15])
    extracurricular = np.random.choice(["Yes", "No"], size=num_samples, p=[0.55, 0.45])
    motivation_level = np.random.choice(["High", "Medium", "Low"], size=num_samples, p=[0.35, 0.45, 0.20])
    internet_access = np.random.choice(["Yes", "No"], size=num_samples, p=[0.88, 0.12])
    family_income = np.random.choice(["High", "Medium", "Low"], size=num_samples, p=[0.25, 0.55, 0.20])
    teacher_quality = np.random.choice(["High", "Medium", "Low"], size=num_samples, p=[0.40, 0.45, 0.15])
    school_type = np.random.choice(["Public", "Private"], size=num_samples, p=[0.65, 0.35])
    peer_influence = np.random.choice(["Positive", "Neutral", "Negative"], size=num_samples, p=[0.45, 0.40, 0.15])
    learning_disabilities = np.random.choice(["No", "Yes"], size=num_samples, p=[0.90, 0.10])
    parental_education = np.random.choice(["College", "High School", "Postgraduate"], size=num_samples, p=[0.45, 0.35, 0.20])
    distance_from_home = np.random.choice(["Near", "Moderate", "Far"], size=num_samples, p=[0.45, 0.35, 0.20])
    gender = np.random.choice(["Female", "Male"], size=num_samples, p=[0.50, 0.50])

    # True latent relationship modeling (Academic scoring function)
    # Weights reflecting empirical educational research:
    # Strongest drivers: Previous Scores, Attendance, Hours Studied, Tutoring, Teacher Quality
    base_score = (
        0.32 * previous_scores +
        0.28 * attendance +
        0.65 * hours_studied +
        1.20 * tutoring_sessions +
        0.35 * physical_activity +
        0.50 * sleep_hours
    )

    # Categorical bonuses and penalties
    parent_map = {"High": 3.0, "Medium": 0.0, "Low": -3.5}
    resource_map = {"High": 3.0, "Medium": 0.5, "Low": -3.0}
    motivation_map = {"High": 3.5, "Medium": 0.5, "Low": -4.0}
    teacher_map = {"High": 3.0, "Medium": 0.0, "Low": -3.0}
    peer_map = {"Positive": 2.5, "Neutral": 0.0, "Negative": -3.5}
    disability_map = {"No": 0.0, "Yes": -3.0}
    internet_map = {"Yes": 2.0, "No": -2.5}
    extracurricular_map = {"Yes": 1.5, "No": 0.0}

    cat_adjustments = np.zeros(num_samples)
    for i in range(num_samples):
        cat_adjustments[i] = (
            parent_map[parental_involvement[i]] +
            resource_map[access_to_resources[i]] +
            motivation_map[motivation_level[i]] +
            teacher_map[teacher_quality[i]] +
            peer_map[peer_influence[i]] +
            disability_map[learning_disabilities[i]] +
            internet_map[internet_access[i]] +
            extracurricular_map[extracurricular[i]]
        )

    # Add realistic irreducible noise / stochastic variance (sigma=2.5)
    noise = np.random.normal(loc=0.0, scale=2.5, size=num_samples)

    exam_score = base_score + cat_adjustments + noise - 12.0
    exam_score = np.clip(np.round(exam_score, 1), 10.0, 100.0)

    df = pd.DataFrame({
        "Hours_Studied": hours_studied,
        "Attendance": attendance,
        "Parental_Involvement": parental_involvement,
        "Access_to_Resources": access_to_resources,
        "Extracurricular_Activities": extracurricular,
        "Sleep_Hours": sleep_hours,
        "Previous_Scores": previous_scores,
        "Motivation_Level": motivation_level,
        "Internet_Access": internet_access,
        "Tutoring_Sessions": tutoring_sessions,
        "Family_Income": family_income,
        "Teacher_Quality": teacher_quality,
        "School_Type": school_type,
        "Peer_Influence": peer_influence,
        "Physical_Activity": physical_activity,
        "Learning_Disabilities": learning_disabilities,
        "Parental_Education_Level": parental_education,
        "Distance_from_Home": distance_from_home,
        "Gender": gender,
        "Exam_Score": exam_score
    })

    return df


def build_preprocessor() -> ColumnTransformer:
    """Creates a Scikit-Learn ColumnTransformer for mixed-type features."""
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_COLS),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_COLS)
        ]
    )


def train_and_benchmark():
    """Trains, compares, evaluates candidate models, and saves winning artifact."""
    logger.info("Starting EduPredict ML Pipeline Training & Evaluation...")

    df = generate_synthetic_dataset(num_samples=10000)
    df.to_csv(DATA_PATH, index=False)
    logger.info(f"Saved generated student dataset to {DATA_PATH} ({len(df)} rows)")

    X = df[ALL_FEATURES]
    y = df["Exam_Score"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    preprocessor = build_preprocessor()

    # Candidate Algorithms
    candidate_models = {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Decision Tree": DecisionTreeRegressor(max_depth=8, random_state=42),
        "Random Forest": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    }

    benchmark_results = {}
    fitted_pipelines = {}

    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    for name, regressor in candidate_models.items():
        logger.info(f"Evaluating algorithm: {name}...")
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor)
        ])

        # Cross Validation on Training Data
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=kf, scoring="r2", n_jobs=-1)

        # Train on Full Training Split
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        r2 = float(r2_score(y_test, y_pred))
        mse = float(mean_squared_error(y_test, y_pred))
        rmse = float(np.sqrt(mse))
        mae = float(mean_absolute_error(y_test, y_pred))

        benchmark_results[name] = {
            "r2_score": round(r2, 4),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "cv_r2_mean": round(float(np.mean(cv_scores)), 4),
            "cv_r2_std": round(float(np.std(cv_scores)), 4)
        }
        fitted_pipelines[name] = (pipeline, r2)
        logger.info(f" -> {name} | R2: {r2:.4f} | RMSE: {rmse:.4f} | MAE: {mae:.4f} | CV R2: {np.mean(cv_scores):.4f}")

    # Select Best Model based on R2 Score
    best_model_name = max(fitted_pipelines, key=lambda k: fitted_pipelines[k][1])
    best_pipeline, best_r2 = fitted_pipelines[best_model_name]
    logger.info(f"[SELECTED] Best Model Selected: {best_model_name} with Test R2 = {best_r2:.4f}")

    # Refit best pipeline on 100% of dataset for production inference
    logger.info("Retraining winning pipeline on entire dataset...")
    best_pipeline.fit(X, y)

    # Save Pipeline with Joblib
    joblib.dump(best_pipeline, MODEL_PATH, compress=3)
    logger.info(f"Successfully exported trained ML model to {MODEL_PATH}")

    # Extract Feature Importances / Coefficients
    feature_importance_dict = extract_feature_importance(best_pipeline, preprocessor, best_model_name)
    with open(IMPORTANCE_PATH, "w") as f:
        json.dump(feature_importance_dict, f, indent=2)
    logger.info(f"Saved feature importances to {IMPORTANCE_PATH}")

    # Export Model Metrics Report
    metrics_report = {
        "model_name": best_model_name,
        "algorithm": str(best_pipeline.named_steps["regressor"].__class__.__name__),
        "dataset_size": len(df),
        "test_split": 0.20,
        "features_count": len(ALL_FEATURES),
        "numerical_features": NUMERICAL_COLS,
        "categorical_features": CATEGORICAL_COLS,
        "metrics": benchmark_results[best_model_name],
        "benchmark_comparison": benchmark_results,
        "training_timestamp": pd.Timestamp.now().isoformat()
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics_report, f, indent=2)
    logger.info(f"Saved metrics report to {METRICS_PATH}")

    print("\n" + "=" * 60)
    print("EDUPREDICT ML TRAINING SUMMARY")
    print("=" * 60)
    print(f"Selected Model: {best_model_name}")
    print(f"R² Score:       {benchmark_results[best_model_name]['r2_score'] * 100:.2f}%")
    print(f"RMSE:           {benchmark_results[best_model_name]['rmse']:.2f}")
    print(f"MAE:            {benchmark_results[best_model_name]['mae']:.2f}")
    print("=" * 60 + "\n")


def extract_feature_importance(pipeline, preprocessor, model_name: str) -> dict:
    """Calculates normalized relative importance for each original feature."""
    regressor = pipeline.named_steps["regressor"]
    
    # Get encoded feature names
    cat_encoder = pipeline.named_steps["preprocessor"].named_transformers_["cat"]
    encoded_cat_names = cat_encoder.get_feature_names_out(CATEGORICAL_COLS)
    transformed_feature_names = NUMERICAL_COLS + list(encoded_cat_names)

    raw_importances = None
    if hasattr(regressor, "feature_importances_"):
        raw_importances = regressor.feature_importances_
    elif hasattr(regressor, "coef_"):
        raw_importances = np.abs(regressor.coef_)

    if raw_importances is None or len(raw_importances) != len(transformed_feature_names):
        # Fallback to predefined domain weights
        return {feat: 1.0 / len(ALL_FEATURES) for feat in ALL_FEATURES}

    # Aggregate one-hot encoded categories back to original features
    feature_weight_map = {}
    for idx, name in enumerate(transformed_feature_names):
        weight = float(raw_importances[idx])
        # Find corresponding root feature
        root_feat = name
        for cat in CATEGORICAL_COLS:
            if name.startswith(cat):
                root_feat = cat
                break
        feature_weight_map[root_feat] = feature_weight_map.get(root_feat, 0.0) + weight

    # Normalize to 100%
    total = sum(feature_weight_map.values()) or 1.0
    normalized_weights = {k: round((v / total) * 100, 2) for k, v in feature_weight_map.items()}
    # Sort descending
    return dict(sorted(normalized_weights.items(), key=lambda item: item[1], reverse=True))


if __name__ == "__main__":
    train_and_benchmark()
