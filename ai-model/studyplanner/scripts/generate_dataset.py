"""
Study Planner Dataset Generator

This script generates synthetic data for training the study planner ML model.
The dataset includes features like difficulty, days_left, past_score, completion,
and available_hours, with priority as the target variable.

Author: GyaanMitra ML Team
Version: 1.0
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

# Set random seed for reproducibility
np.random.seed(42)

# Define the parent directory for data storage
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

def generate_synthetic_dataset(n_samples=500):
    """
    Generate synthetic study planner dataset with realistic patterns.
    
    Parameters:
    -----------
    n_samples : int
        Number of samples to generate (default: 500)
    
    Returns:
    --------
    pd.DataFrame
        DataFrame with columns: difficulty, days_left, past_score, 
                                completion, available_hours, priority
    """
    
    print(f"Generating {n_samples} synthetic study planner records...")
    
    # Generate features with realistic distributions
    difficulty = np.random.choice([3, 4, 5, 6, 7, 8, 9, 10], size=n_samples)
    days_left = np.random.choice(range(1, 61), size=n_samples)  # 1 to 60 days until exam
    past_score = np.random.uniform(0, 100, size=n_samples)  # Past exam/test scores (0-100)
    completion = np.random.uniform(0, 100, size=n_samples)  # Percentage of syllabus completed
    available_hours = np.random.choice(range(1, 9), size=n_samples)  # Daily study hours (1-8)
    
    # Determine priority based on intelligent rules
    priority = []
    
    for i in range(n_samples):
        diff = difficulty[i]
        days = days_left[i]
        score = past_score[i]
        comp = completion[i]
        hours = available_hours[i]
        
        # Priority Logic:
        # HIGH: Exam is near (days <= 14) AND (low score OR low completion OR high difficulty)
        #       OR incomplete syllabus with very little time
        if days <= 14 and ((score < 50 or comp < 40) or diff >= 8):
            p = "high"
        # HIGH: Very difficult subject with any low performance
        elif diff >= 9 and score < 60:
            p = "high"
        # NORMAL: Moderate time remaining with moderate performance
        elif 15 <= days <= 30 and (40 <= score < 75 or 40 <= comp < 75):
            p = "normal"
        # NORMAL: Exam is medium distance away (30-45 days)
        elif 30 < days <= 45 and comp < 85:
            p = "normal"
        # LOW: Plenty of time remaining OR good score/completion
        elif days > 45 or (score >= 75 and comp >= 75):
            p = "low"
        # DEFAULT: Normal for borderline cases
        else:
            p = "normal"
        
        priority.append(p)
    
    # Create DataFrame
    df = pd.DataFrame({
        'difficulty': difficulty.astype(int),
        'days_left': days_left,
        'past_score': np.round(past_score, 2),
        'completion': np.round(completion, 2),
        'available_hours': available_hours,
        'priority': priority
    })
    
    # Display distribution statistics
    print("\n" + "="*60)
    print("Dataset Generation Summary")
    print("="*60)
    print(f"Total Records: {len(df)}")
    print(f"\nPriority Distribution:")
    print(df['priority'].value_counts())
    print(f"\nFeature Statistics:")
    print(df[['difficulty', 'days_left', 'past_score', 'completion', 'available_hours']].describe())
    print("="*60 + "\n")
    
    return df


def save_dataset(df, output_path=None):
    """
    Save the generated dataset to a CSV file.
    
    Parameters:
    -----------
    df : pd.DataFrame
        The dataset to save
    output_path : str or Path, optional
        Path to save the CSV file. If None, uses default data directory.
    """
    if output_path is None:
        output_path = DATA_DIR / "study_planner_dataset.csv"
    
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    df.to_csv(output_path, index=False)
    print(f"✓ Dataset saved successfully to: {output_path}")
    print(f"  File size: {output_path.stat().st_size / 1024:.2f} KB")


def main():
    """Main execution function."""
    print("\n" + "="*60)
    print("Study Planner Dataset Generator")
    print("="*60 + "\n")
    
    # Generate synthetic dataset
    dataset = generate_synthetic_dataset(n_samples=500)
    
    # Save to CSV
    save_dataset(dataset)
    
    print("✓ Dataset generation completed successfully!")


if __name__ == "__main__":
    main()
