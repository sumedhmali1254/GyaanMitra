"""
Study Planner ML Model Training Script - SIMPLIFIED

This script trains a RandomForestClassifier on YOUR existing CSV dataset
to predict study priority levels.

Steps:
1. You put your CSV file in data/study_planner_dataset.csv
2. Run this script
3. Model is trained and saved
4. Done!

Author: GyaanMitra ML Team
Version: 2.0
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib


# Define paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"

# Ensure models directory exists
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# File paths
DATASET_PATH = DATA_DIR / "study_planner_dataset.csv"
MODEL_PATH = MODELS_DIR / "study_planner_model.pkl"
LABEL_ENCODER_PATH = MODELS_DIR / "label_encoder.pkl"


def load_dataset(filepath):
    """
    Load your CSV file.
    
    Your CSV must have these columns:
    - difficulty
    - days_left
    - past_score
    - completion
    - available_hours
    - priority
    """
    try:
        print(f"📂 Loading your dataset from: {filepath}\n")
        df = pd.read_csv(filepath)
        print(f"✓ Success! Loaded {len(df)} rows")
        print(f"✓ Columns found: {list(df.columns)}\n")
        return df
    except FileNotFoundError:
        print(f"❌ ERROR: File not found at {filepath}")
        print(f"   Please make sure your CSV is named: study_planner_dataset.csv")
        print(f"   And it's in the: data/ folder")
        exit(1)


def preprocess_data(df):
    """
    Get your data ready for training.
    """
    print("🔧 Preparing data for training...\n")
    
    # Exact column names needed
    feature_columns = ['difficulty', 'days_left', 'past_score', 'completion', 'available_hours']
    target_column = 'priority'
    
    # Check if all columns exist
    for col in feature_columns + [target_column]:
        if col not in df.columns:
            print(f"❌ ERROR: Column '{col}' not found in your CSV!")
            print(f"   Your columns are: {list(df.columns)}")
            print(f"   Need: {feature_columns + [target_column]}")
            exit(1)
    
    # Check for missing values
    missing = df[feature_columns + [target_column]].isnull().sum().sum()
    if missing > 0:
        print(f"⚠️  Found {missing} empty cells. Removing them...")
        df = df[feature_columns + [target_column]].dropna()
    
    # Separate features (X) and target (y)
    X = df[feature_columns].copy()
    y = df[target_column].copy()
    
    # Check priority values
    valid_priorities = ["low", "normal", "high"]
    invalid = y[~y.isin(valid_priorities)]
    if len(invalid) > 0:
        print(f"❌ ERROR: Found invalid priority values: {invalid.unique()}")
        print(f"   Priority must be: low, normal, or high")
        exit(1)
    
    print(f"✓ Data ready!")
    print(f"  Total rows: {len(df)}")
    print(f"  Features: {len(X)} rows × {len(feature_columns)} columns")
    print(f"  Target: {len(y)} rows\n")
    
    return X, y, feature_columns


def encode_target(y):
    """
    Convert text priorities to numbers (low=0, normal=1, high=2).
    """
    print("📝 Encoding priorities to numbers...\n")
    
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    mapping = dict(zip(label_encoder.classes_, label_encoder.transform(label_encoder.classes_)))
    print(f"✓ Encoding done! Mapping:")
    for priority, num in mapping.items():
        count = (y == priority).sum()
        print(f"  {priority.upper()}: {num} (found {count} times in your data)")
    print()
    
    return y_encoded, label_encoder


def train_model(X_train, y_train):
    """
    Train the machine learning model.
    
    This teaches the model to recognize patterns in your data.
    """
    print("🤖 Training the Machine Learning model...\n")
    
    # Create and train model
    model = RandomForestClassifier(
        n_estimators=100,        # 100 decision trees
        max_depth=15,            # How deep each tree can go
        random_state=42,         # For reproducibility
        n_jobs=-1                # Use all CPU cores
    )
    
    model.fit(X_train, y_train)
    
    print(f"✓ Model trained successfully!")
    print(f"  Number of decision trees: 100")
    print(f"  Training data rows: {len(X_train)}\n")
    
    return model


def evaluate_model(model, X_train, X_test, y_train, y_test, label_encoder, feature_columns):
    """
    Check how accurate the trained model is.
    
    Accuracy > 85% = Good model
    Accuracy 75-85% = Acceptable
    Accuracy < 75% = Training data might need improvement
    """
    print("="*60)
    print("📊 MODEL ACCURACY REPORT")
    print("="*60 + "\n")
    
    # Make predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Calculate accuracy
    train_accuracy = accuracy_score(y_train, y_train_pred)
    test_accuracy = accuracy_score(y_test, y_test_pred)
    
    print(f"Training Accuracy: {train_accuracy:.4f} ({train_accuracy*100:.2f}%)")
    print(f"Test Accuracy:     {test_accuracy:.4f} ({test_accuracy*100:.2f}%)\n")
    
    if test_accuracy >= 0.85:
        print("✅ EXCELLENT! Model is ready to use!")
    elif test_accuracy >= 0.75:
        print("✓ GOOD! Model is ready to use!")
    else:
        print("⚠️  WARNING: Accuracy could be better. Check your CSV data quality.")
    
    # Show what the model predicts
    print(f"\n{'─'*60}")
    print("📈 DETAILED RESULTS")
    print(f"{'─'*60}\n")
    
    y_test_labels = label_encoder.inverse_transform(y_test)
    y_test_pred_labels = label_encoder.inverse_transform(y_test_pred)
    print(classification_report(y_test_labels, y_test_pred_labels))
    
    # Which features matter most
    print(f"{'─'*60}")
    print("🎯 MOST IMPORTANT FEATURES")
    print(f"{'─'*60}\n")
    feature_importance = model.feature_importances_
    importance_df = pd.DataFrame({
        'Feature': feature_columns,
        'Importance': feature_importance
    }).sort_values('Importance', ascending=False)
    
    for idx, row in importance_df.iterrows():
        percentage = row['Importance'] * 100
        bar = "█" * int(percentage / 5)
        print(f"  {row['Feature']:<20} {percentage:>5.1f}% {bar}")
    
    print("\n" + "="*60 + "\n")


def save_model(model, model_path):
    """Save the trained model to a file."""
    model_path = Path(model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    
    joblib.dump(model, model_path)
    size_kb = model_path.stat().st_size / 1024
    print(f"✓ Model saved: {model_path}")
    print(f"  File size: {size_kb:.2f} KB\n")


def save_label_encoder(label_encoder, encoder_path):
    """Save the label encoder to a file."""
    encoder_path = Path(encoder_path)
    encoder_path.parent.mkdir(parents=True, exist_ok=True)
    
    joblib.dump(label_encoder, encoder_path)
    size_kb = encoder_path.stat().st_size / 1024
    print(f"✓ Label encoder saved: {encoder_path}")
    print(f"  File size: {size_kb:.2f} KB\n")


def main():
    """
    Complete training pipeline.
    What happens:
    1. Load your CSV file
    2. Check if data is valid
    3. Split into training (80%) and testing (20%) sets
    4. Train the model on training set
    5. Check accuracy on testing set
    6. Save the trained model
    7. Done! Ready to use
    """
    print("\n" + "="*70)
    print(" " * 15 + "🤖 STUDY PLANNER ML MODEL TRAINING")
    print("="*70 + "\n")
    
    # Step 1: Load your CSV
    print("STEP 1️⃣ : Loading your dataset...")
    print("-" * 70)
    df = load_dataset(DATASET_PATH)
    
    # Step 2: Prepare data
    print("STEP 2️⃣ : Checking and preparing data...")
    print("-" * 70)
    X, y, feature_columns = preprocess_data(df)
    
    # Step 3: Convert text priorities to numbers
    print("STEP 3️⃣ : Converting priorities...")
    print("-" * 70)
    y_encoded, label_encoder = encode_target(y)
    
    # Step 4: Split data
    print("STEP 4️⃣ : Splitting into training and testing sets...")
    print("-" * 70)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"✓ Split completed!")
    print(f"  Training: {len(X_train)} rows (80%)")
    print(f"  Testing:  {len(X_test)} rows (20%)\n")
    
    # Step 5: Train
    print("STEP 5️⃣ : Training the model...")
    print("-" * 70)
    model = train_model(X_train, y_train)
    
    # Step 6: Evaluate
    print("STEP 6️⃣ : Checking accuracy...")
    print("-" * 70)
    evaluate_model(model, X_train, X_test, y_train, y_test, label_encoder, feature_columns)
    
    # Step 7: Save
    print("STEP 7️⃣ : Saving model...")
    print("-" * 70)
    save_model(model, MODEL_PATH)
    save_label_encoder(label_encoder, LABEL_ENCODER_PATH)
    
    # Done!
    print("="*70)
    print("✅ SUCCESS! Model is trained and ready!")
    print("="*70)
    print("\n📌 Next step: Run 'python app.py' to start the API server\n")


if __name__ == "__main__":
    main()
