"""
Study Planner FastAPI Server - V4.0
SLOT-BASED ENGINE: Zero-overlap, per-day availability, smart prioritization,
per-subject feasibility analysis, AI advisor recommendations.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import joblib
import numpy as np
import logging
import traceback
import math
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define paths
PROJECT_ROOT = Path(__file__).parent
MODELS_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODELS_DIR / "study_planner_model.pkl"
LABEL_ENCODER_PATH = MODELS_DIR / "label_encoder.pkl"

# Global variables
model = None
label_encoder = None

def load_models():
    """Load the trained model and label encoder."""
    global model, label_encoder
    
    try:
        if not MODEL_PATH.exists():
            logger.error(f"Model file not found at {MODEL_PATH}")
            logger.error("Please run: python trainmodel.py first")
            return False
        
        if not LABEL_ENCODER_PATH.exists():
            logger.error(f"Label encoder not found at {LABEL_ENCODER_PATH}")
            return False
        
        model = joblib.load(MODEL_PATH)
        label_encoder = joblib.load(LABEL_ENCODER_PATH)
        
        logger.info(" Models loaded successfully!")
        return True
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup
    logger.info("Starting up...")
    models_loaded = load_models()
    if not models_loaded:
        logger.warning("Models not loaded. Please train the model first.")
    yield
    # Shutdown
    logger.info("Shutting down...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Study Planner ML API",
    description="ML API for predicting study priority and generating weekly study timetables",
    version="4.0.0",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Request/Response Schemas
# ============================================================================

class PredictionRequest(BaseModel):
    """Request schema for study priority prediction."""
    difficulty: int = Field(..., ge=1, le=10)
    examDate: str = Field(..., description="Exam date in YYYY-MM-DD format")
    pastScore: float = Field(..., ge=0, le=100)
    completion: float = Field(..., ge=0, le=100)
    availableHours: int = Field(..., ge=1)
    
    @field_validator('examDate')
    def validate_exam_date(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError('examDate must be in YYYY-MM-DD format')


class PredictionResponse(BaseModel):
    """Response schema for prediction output."""
    priority: str
    recommendedHours: int
    daysLeft: int
    confidence: float


class DayAvailability(BaseModel):
    """Per-day availability."""
    enabled: bool = True
    start: str = "06:00 AM"
    end: str = "10:00 PM"


class SubjectInputSchema(BaseModel):
    """Schema for a single subject in timetable generation."""
    subject: str = Field(..., description="Subject name")
    examDate: str = Field(..., description="Exam date in YYYY-MM-DD format")
    chapters: int = Field(..., ge=1, le=100)
    avg_chapter_time: Optional[float] = Field(None, ge=0.5)
    beginnerMode: bool = Field(default=False)
    
    # Beginner mode fields
    familiarity: Optional[str] = Field(default="none")
    syllabusSize: Optional[str] = Field(default="medium")
    
    # Advanced mode fields
    difficulty: Optional[int] = Field(default=None, ge=1, le=10)
    pastScore: Optional[float] = Field(default=None, ge=0, le=100)
    completion: Optional[float] = Field(default=None, ge=0, le=100)
    
    @field_validator('examDate')
    def validate_exam_date(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError('examDate must be in YYYY-MM-DD format')


class GeneratePlanRequest(BaseModel):
    """Request schema for generating weekly study plan."""
    availableHoursPerDay: float = Field(..., ge=0.5)
    startHour: int = Field(default=6, ge=0, le=23)
    endHour: int = Field(default=20, ge=0, le=23)
    subjects: List[SubjectInputSchema] = Field(..., min_length=1)
    weeklyAvailability: Optional[Dict[str, Any]] = None
    
    @field_validator('endHour')
    def validate_hours(cls, v, info):
        data = info.data
        if 'startHour' in data and v <= data['startHour']:
            # Auto-fix instead of rejecting
            return max(data['startHour'] + 1, 20)
        return v


class TimetableEntryResponse(BaseModel):
    """Single timetable entry."""
    id: str
    date: str
    day: str
    subject: str
    chapter: int
    startTime: str
    endTime: str
    duration: float
    priority: str
    daysLeft: int


class AIRecommendation(BaseModel):
    """Per-subject AI advisor recommendation."""
    subjectName: str
    priority: str
    daysLeft: int
    chaptersTotal: int
    chaptersCoverable: float
    hoursNeeded: float
    hoursAvailable: float
    hoursScheduled: float
    percentageCompleted: float
    shortageHours: float
    recommendedDailyHours: float
    message: str
    dailyPlan: List[str]
    # New fields for V5
    extraHoursNeededTotal: float = 0.0
    isFeasible: bool = True
    suggestedDailyFix: float = 0.0


class GeneratePlanResponse(BaseModel):
    """Response schema for generated study plan."""
    status: str
    feasibility_status: str
    required_daily_hrs: float
    available_daily_hrs: float
    message: str
    detailed_message: str
    totalEntries: int
    totalHours: float
    subjects: List[str]
    startDate: str
    endDate: str
    daily_summaries: List[str]
    timetable: List[TimetableEntryResponse]
    ai_recommendations: List[AIRecommendation] = []


# ============================================================================
# Helper Functions
# ============================================================================

def normalize_beginner_values(familiarity: str, syllabusSize: str) -> tuple:
    """Convert beginner mode inputs to ML-friendly values."""
    familiarity_map = {"none": 0, "little": 25, "moderate": 50, "strong": 75}
    size_map = {"small": 4, "medium": 6, "large": 8}
    
    completion = familiarity_map.get(familiarity.lower(), 0)
    difficulty = size_map.get(syllabusSize.lower(), 6)
    
    return completion, difficulty


def calculate_days_left(exam_date_str):
    """Calculate days until exam."""
    try:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
        today = datetime.now().date()
        days_left = (exam_date - today).days
        return max(1, days_left)
    except ValueError as e:
        raise ValueError(f"Invalid date format. Expected YYYY-MM-DD, got {exam_date_str}")


def predict_priority(features):
    """Predict priority level using trained model."""
    if model is None or label_encoder is None:
        raise ValueError("Models not loaded")
    
    prediction = model.predict([features])[0]
    probabilities = model.predict_proba([features])[0]
    confidence = np.max(probabilities)
    priority_label = label_encoder.inverse_transform([prediction])[0]
    return priority_label, confidence


def parse_time_to_hour(time_str: str) -> float:
    """Convert 'HH:MM AM/PM' or 'HH:MM' to decimal hour (e.g., 18.5 for 6:30 PM)."""
    time_str = time_str.strip()
    try:
        # Try HH:MM AM/PM format
        if "AM" in time_str.upper() or "PM" in time_str.upper():
            dt = datetime.strptime(time_str.upper(), "%I:%M %p")
            return dt.hour + dt.minute / 60.0
        else:
            # Try HH:MM (24-hour) format
            parts = time_str.split(":")
            return int(parts[0]) + int(parts[1]) / 60.0
    except Exception:
        return 6.0  # safe default


def format_decimal_to_ampm(decimal_hour: float) -> str:
    """Convert decimal hour (e.g., 18.5) to '00:30 PM' format."""
    # Fix potential precision issues (e.g. 19.9999 -> 20:00)
    h = int(decimal_hour)
    m = int(round((decimal_hour - h) * 60))
    if m >= 60:
        h += 1
        m -= 60
    
    h24 = h % 24
    period = "AM" if h24 < 12 else "PM"
    h12 = h24 % 12 or 12
    return f"{h12:02d}:{m:02d} {period}"


def get_day_window(day_date: date, weekly_avail: Optional[Dict], default_start: int, default_end: int) -> tuple:
    """
    Returns (start_hour_decimal, end_hour_decimal, is_enabled) for a specific date.
    Respects user's per-day custom availability.
    """
    day_name = day_date.strftime("%A")   # e.g. "Monday"
    
    if weekly_avail and day_name in weekly_avail:
        config = weekly_avail[day_name]
        enabled = config.get("enabled", True)
        if not enabled:
            return (0, 0, False)
        
        start_h = parse_time_to_hour(config.get("start", f"{default_start}:00 AM"))
        end_h = parse_time_to_hour(config.get("end", f"{default_end}:00 PM"))
        
        if end_h <= start_h:
            end_h = start_h + 4  # safety fallback
        
        return (start_h, end_h, True)
    
    return (float(default_start), float(default_end), True)


# ============================================================================
# V4 Slot-Based Scheduling Engine  Zero Overlap
# ============================================================================

def generate_slot_based_plan(
    subjects_data: List[Dict],
    available_hours_per_day: float,
    start_hour: int,
    end_hour: int,
    weekly_availability: Optional[Dict] = None
) -> tuple:
    """
    Generate a strictly slot-based, zero-overlap timetable.
    
    Algorithm:
    1. Sort subjects strictly by exam urgency (days left ascending), then by priority level.
    2. For each day from today until the last exam:
       a. Get the day's availability window (start, end) from custom weekly config.
       b. Skip if the day is disabled.
       c. Build a priority queue of subjects that STILL need study time before their exam.
       d. Fill the day's time window sequentially  one session after another, never overlap.
       e. Each session = 1 chapter  avg_chapter_time.
    3. Return the flat list of timetable entries and final subject states.
    """
    timetable = []
    today = datetime.now().date()
    
    subject_states = []
    for subj in subjects_data:
        exam_date = datetime.strptime(subj["examDate"], "%Y-%m-%d").date()
        avg_time = subj.get("avg_chapter_time") or 1.5
        total_chapters = subj["chapters"]
        
        subject_states.append({
            "subject": subj["subject"],
            "examDate": exam_date,
            "chapters": total_chapters,
            "avg_chapter_time": avg_time,
            "priority": subj.get("priority", "normal"),
            "chapters_remaining": total_chapters,
            "next_chapter": 1,
            "invested_time_in_current_chapter": 0.0,
            "hours_needed": total_chapters * avg_time,
            "hours_scheduled": 0.0,
        })
    
    latest_exam = max(s["examDate"] for s in subject_states)
    total_days = max(1, (latest_exam - today).days + 1)
    
    priority_order = {"high": 0, "normal": 1, "low": 2}
    
    for day_offset in range(total_days):
        current_date = today + timedelta(days=day_offset)
        
        window_start, window_end, enabled = get_day_window(
            current_date, weekly_availability, start_hour, end_hour
        )
        
        if not enabled:
            continue
        
        available_window = window_end - window_start
        if available_window <= 0:
            continue
        
        max_study_hours = min(available_window, available_hours_per_day)
        
        # Build strict urgency sorted queue
        # Exclude exam days from study scheduling (subject must be finished by the day BEFORE the exam)
        active_subjects = [
            s for s in subject_states
            if s["chapters_remaining"] > 0 and s["examDate"] > current_date
        ]
        
        # V5 Block-Based Scheduling: Max 1-2 subjects per day, contiguous blocks.
        
        # 1. Focus Logic: If there's an exam tomorrow, ONLY study for those subjects today.
        # We look at ALL subjects, even if finished, because the day before the exam should be dedicated to it.
        tomorrow_exam_subjects = [
            s for s in subject_states
            if (s["examDate"] - current_date).days == 1
        ]
        
        if tomorrow_exam_subjects:
            subjects_for_today = tomorrow_exam_subjects
        else:
            # Normal Priority Logic: sort by urgency and priority, take top 2
            active_subjects = [
                s for s in subject_states
                if s["chapters_remaining"] > 0 and s["examDate"] > current_date
            ]
            active_subjects.sort(key=lambda s: (
                (s["examDate"] - current_date).days,
                priority_order.get(s["priority"], 2),
            ))
            subjects_for_today = active_subjects[:2]
        
        if not subjects_for_today:
            continue
            
        cursor = window_start
        hours_used = 0.0
        
        # 3. Schedule each selected subject in a contiguous block
        for subj_state in subjects_for_today:
            if hours_used >= max_study_hours:
                break
                
            is_exam_tomorrow = (subj_state["examDate"] - current_date).days == 1
            
            if is_exam_tomorrow:
                # If exam is tomorrow, consume as much budget as possible, split evenly among tomorrow's exams
                target_hours = (max_study_hours - hours_used) / max(1, len([s for s in subjects_for_today if (s["examDate"] - current_date).days == 1]))
                target_hours = min(target_hours, max_study_hours - hours_used)
                
                # Cap pure revision to 2.0 hours max per subject so it doesn't take the whole day
                if subj_state["chapters_remaining"] == 0:
                    target_hours = min(target_hours, 2.0)
            else:
                days_left_for_exam = max(1, (subj_state["examDate"] - current_date).days)
                total_hours_left_for_subject = (subj_state["chapters_remaining"] * subj_state["avg_chapter_time"]) - subj_state["invested_time_in_current_chapter"]
                
                fair_daily_quota = math.ceil((total_hours_left_for_subject / days_left_for_exam) * 4) / 4
                remaining_day_budget = max_study_hours - hours_used
                target_hours = min(fair_daily_quota, remaining_day_budget)
                
                if target_hours < 1.0 and total_hours_left_for_subject >= 1.0:
                    target_hours = min(1.0, remaining_day_budget)
            
            if target_hours <= 0:
                continue

            current_subj_scheduled = 0.0
            daily_subj_start_cursor = cursor
            initial_chapter = subj_state["next_chapter"] if subj_state["chapters_remaining"] > 0 else "Revision"
            
            # Progress through chapters
            while current_subj_scheduled < target_hours - 0.01:
                avg_time = subj_state["avg_chapter_time"]
                
                if subj_state["chapters_remaining"] > 0:
                    time_to_finish_chapter = avg_time - subj_state["invested_time_in_current_chapter"]
                    remaining_to_schedule = target_hours - current_subj_scheduled
                    step_duration = min(time_to_finish_chapter, remaining_to_schedule)
                    
                    current_subj_scheduled += step_duration
                    subj_state["invested_time_in_current_chapter"] += step_duration
                    
                    if subj_state["invested_time_in_current_chapter"] >= avg_time - 0.01:
                        subj_state["chapters_remaining"] -= 1
                        subj_state["next_chapter"] += 1
                        subj_state["invested_time_in_current_chapter"] = 0.0
                else:
                    # It's revision time
                    remaining_to_schedule = target_hours - current_subj_scheduled
                    current_subj_scheduled += remaining_to_schedule
                    break

            final_session_duration = round(current_subj_scheduled * 2) / 2
            
            if not is_exam_tomorrow and final_session_duration < 1.0 and ((subj_state["chapters_remaining"] * subj_state["avg_chapter_time"]) >= 1.0):
                 final_session_duration = 1.0
            
            final_session_duration = min(final_session_duration, max_study_hours - hours_used)
            
            if final_session_duration > 0.4:
                days_left = max(1, (subj_state["examDate"] - current_date).days)
                
                entry = TimetableEntryResponse(
                    id=f"{current_date.strftime('%Y%m%d')}_{subj_state['subject'][:3]}_{initial_chapter}_{daily_subj_start_cursor:.2f}".replace('.', ''),
                    date=current_date.strftime("%Y-%m-%d"),
                    day=current_date.strftime("%A"),
                    subject=subj_state["subject"],
                    chapter=int(initial_chapter) if str(initial_chapter).isdigit() else 0, # Send 0 for revision
                    startTime=format_decimal_to_ampm(daily_subj_start_cursor),
                    endTime=format_decimal_to_ampm(daily_subj_start_cursor + final_session_duration),
                    duration=round(final_session_duration, 2),
                    priority=subj_state["priority"],
                    daysLeft=days_left
                )
                
                timetable.append(entry)
                
                # Final state sync
                cursor += final_session_duration
                hours_used += final_session_duration
                subj_state["hours_scheduled"] += final_session_duration
            
    return timetable, subject_states


# ============================================================================
# V4 Per-Subject Feasibility Analysis  AI Advisor
# ============================================================================

def calculate_feasibility_v2(
    subjects_data: List[Dict],
    subject_states: List[Dict],
    available_hours_per_day: float,
    weekly_availability: Optional[Dict] = None,
    start_hour: int = 6,
    end_hour: int = 20
) -> tuple:
    today = datetime.now().date()
    
    recommendations = []
    total_hours_needed = 0
    total_hours_available_in_windows = 0
    overall_feasible = True
    total_shortage = 0.0
    
    scheduled_map = {s["subject"]: s["hours_scheduled"] for s in subject_states}
    
    # Calculate earliest exam to determine the planning horizon for global stats
    exam_dates = [datetime.strptime(s["examDate"], "%Y-%m-%d").date() for s in subjects_data]
    earliest_exam = min(exam_dates)
    latest_exam = max(exam_dates)
    days_until_earliest = max(1, (earliest_exam - today).days)
    
    # Calculate total capacity across the window (Prediction: what is the MAX this user can study?)
    for d in range((latest_exam - today).days + 1):
        day_date = today + timedelta(days=d)
        w_start, w_end, enabled = get_day_window(day_date, weekly_availability, start_hour, end_hour)
        if enabled:
            total_hours_available_in_windows += (w_end - w_start)

    for subj in subjects_data:
        exam_date = datetime.strptime(subj["examDate"], "%Y-%m-%d").date()
        days_left = max(1, (exam_date - today).days)
        chapters = subj["chapters"]
        avg_time = subj.get("avg_chapter_time") or 1.5
        hours_needed = chapters * avg_time
        actually_scheduled = scheduled_map.get(subj["subject"], 0.0)
        
        # Available hours for this subject specific timeframe
        available_for_subject = 0
        for d in range(days_left):
            day_date = today + timedelta(days=d)
            w_start, w_end, enabled = get_day_window(day_date, weekly_availability, start_hour, end_hour)
            if enabled:
                day_window = min(w_end - w_start, available_hours_per_day)
                available_for_subject += day_window
            
        total_hours_needed += hours_needed
        
        shortage = max(0.0, hours_needed - actually_scheduled)
        total_shortage += shortage
        
        chapters_coverable = round(actually_scheduled / avg_time, 1) if avg_time > 0 else chapters
        chapters_coverable = min(chapters, chapters_coverable)
        percent_completed = min(100.0, actually_scheduled / max(0.1, hours_needed) * 100.0)
        
        # The fix: How many daily hours needed to cover everything for this subject within its days_left
        recommended_daily = math.ceil(hours_needed / max(1, days_left) * 10) / 10
        is_sub_feasible = actually_scheduled >= hours_needed - 0.1
        
        if not is_sub_feasible:
            overall_feasible = False
            message = (
                f"[ADVISOR] {subj['subject']}: ACTION REQUIRED! You are short {shortage:.1f} hours to finish {chapters} chapters. "
                f"Currently, only {chapters_coverable:.1f} chapters will be covered ({percent_completed:.0f}% completion). "
                f"To fix this, you MUST increase your daily study time for this subject to {recommended_daily:.1f} hours. "
                f"Implementing this fix will resolve the {shortage:.1f} hour deficit."
            )
            
            daily_suggestions = []
            for d in range(min(days_left, 7)):
                day_date = today + timedelta(days=d)
                day_name = day_date.strftime("%A")
                daily_suggestions.append(f"{day_name} ({day_date.strftime('%b %d')}): Target {recommended_daily:.1f}h (Current: {available_hours_per_day}h)")
        else:
            message = (
                f"[ADVISOR] {subj['subject']}: Everything looks good! You can comfortably cover all {chapters} chapters "
                f"within your current {available_hours_per_day}h daily limit."
            )
            daily_suggestions = []
        
        recommendations.append(AIRecommendation(
            subjectName=subj["subject"],
            priority=subj.get("priority", "normal"),
            daysLeft=days_left,
            chaptersTotal=chapters,
            chaptersCoverable=chapters_coverable,
            hoursNeeded=round(hours_needed, 1),
            hoursAvailable=round(available_for_subject, 1),
            hoursScheduled=round(actually_scheduled, 1),
            percentageCompleted=round(percent_completed, 1),
            shortageHours=round(shortage, 1),
            recommendedDailyHours=recommended_daily,
            message=message,
            dailyPlan=daily_suggestions,
            extraHoursNeededTotal=round(shortage, 1),
            isFeasible=is_sub_feasible,
            suggestedDailyFix=recommended_daily if not is_sub_feasible else available_hours_per_day
        ))
    
    required_daily_hrs = round(total_hours_needed / max(1, days_until_earliest), 1)
    
    # Prediction logic: Maximum realistic study time based on window and subject complexity
    # We use the total shortage to give a very specific instruction
    if overall_feasible:
        status = "feasible"
        toast_msg = f"Schedule is optimal! You are studying {required_daily_hrs:.1f} hrs/day."
        detailed_msg = f"Based on your capacity, you can comfortably finish all subjects."
    else:
        status = "warning"
        # Calculate how many total extra hours they need to add to their plan
        extra_weekly = round(total_shortage, 1)
        # Prediction of max study capacity: window hours * some fatigue factor (e.g. 0.85)
        max_capacity_prediction = round(total_hours_available_in_windows * 0.85, 1)
        
        if total_hours_needed > total_hours_available_in_windows:
            status = "impossible"
            toast_msg = f"❌ IMPOSSIBLE PLAN: Even in full windows, you are short {round(total_hours_needed - total_hours_available_in_windows, 1)} hrs!"
            detailed_msg = (
                f"CRITICAL WARNING: The total windows you provided ({total_hours_available_in_windows:.1f}h) "
                f"are less than the {total_hours_needed:.1f}h needed! "
                f"You MUST extend your start/end study slots or skip less important chapters to be successful."
            )
        else:
            toast_msg = f"⚠️ FIX NEEDED: Add {extra_weekly} total extra hours to cover all subjects!"
            detailed_msg = (
                f"AI Prediction: Your maximum potential study capacity is ~{max_capacity_prediction} hours total before the exams. "
                f"You currently have {total_shortage:.1f} hours shortage. "
                f"To study maximally for your exams, you should increase your Daily Slot limit from {available_hours_per_day}h to {required_daily_hrs:.1f}h. "
                f"Implementing this will ensure 100% syllabus coverage."
            )
    
    return status, required_daily_hrs, toast_msg, detailed_msg, recommendations


def generate_daily_summaries(timetable: List[TimetableEntryResponse]) -> List[str]:
    """Generate daily summaries."""
    if not timetable:
        return []
    
    summaries = []
    current_date = timetable[0].date
    subjects = []
    hours = 0
    
    for entry in timetable:
        if entry.date != current_date:
            summaries.append(f"{current_date}: {', '.join(subjects)} - {hours:.1f} hrs")
            current_date = entry.date
            subjects = [entry.subject]
            hours = entry.duration
        else:
            if entry.subject not in subjects:
                subjects.append(entry.subject)
            hours += entry.duration
    
    if subjects:
        summaries.append(f"{current_date}: {', '.join(subjects)} - {hours:.1f} hrs")
    
    return summaries


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/")
async def root():
    return {
        "name": "Study Planner ML API",
        "version": "4.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "info": "/info",
            "predict": "/predict (POST)",
            "generate_plan": "/generate-plan (POST)",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": model is not None,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/info")
async def model_info():
    if model is None or label_encoder is None:
        return {"status": "Models not loaded", "message": "Please train the model first"}
    
    return {
        "status": "ready",
        "model_type": "RandomForestClassifier",
        "classes": list(label_encoder.classes_)
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict_priority_endpoint(request: PredictionRequest):
    """Predict study priority for a single subject."""
    try:
        if model is None or label_encoder is None:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        days_left = calculate_days_left(request.examDate)
        
        features = np.array([
            request.difficulty,
            days_left,
            request.pastScore,
            request.completion,
            request.availableHours
        ], dtype=float)
        
        priority, confidence = predict_priority(features)
        
        return PredictionResponse(
            priority=priority,
            recommendedHours=request.availableHours,
            daysLeft=days_left,
            confidence=round(confidence, 4)
        )
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# MAIN ENDPOINT: generate-plan V4  Slot-Based, Zero-Overlap
# ============================================================================
@app.post("/generate-plan", response_model=GeneratePlanResponse)
async def generate_study_plan(request: GeneratePlanRequest):
    """
    Generate a weekly study timetable with:
    - Strict slot-based, zero-overlap scheduling
    - Per-day custom availability windows
    - Urgency-first subject prioritization
    - Per-subject AI advisor recommendations
    """
    try:
        if model is None or label_encoder is None:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        print("\n" + "="*60)
        print(" GENERATING STUDY PLAN V4 (Slot-Based)")
        print("="*60)
        print(f"Subjects: {len(request.subjects)}")
        print(f"Available hours/day: {request.availableHoursPerDay}")
        print(f"Study window: {request.startHour}:00 - {request.endHour}:00")
        if request.weeklyAvailability:
            print(f"Custom weekly availability: YES")
        for si, s in enumerate(request.subjects):
            print(f"  Subject {si+1}: {s.subject} | exam={s.examDate} | ch={s.chapters} | avg_t={s.avg_chapter_time} | beginner={s.beginnerMode} | diff={s.difficulty} | score={s.pastScore} | comp={s.completion}")
        
        # Process subjects  get ML predictions
        subjects_with_predictions = []
        
        for subject_input in request.subjects:
            if subject_input.beginnerMode:
                completion, difficulty = normalize_beginner_values(
                    subject_input.familiarity or "none",
                    subject_input.syllabusSize or "medium"
                )
                pastScore = 0
            else:
                completion = subject_input.completion if subject_input.completion is not None else 50
                difficulty = subject_input.difficulty if subject_input.difficulty is not None else 5
                pastScore = subject_input.pastScore if subject_input.pastScore is not None else 50
            
            days_left = calculate_days_left(subject_input.examDate)
            
            features = np.array([
                difficulty,
                days_left,
                pastScore,
                completion,
                int(request.availableHoursPerDay)
            ], dtype=float)
            
            priority, confidence = predict_priority(features)
            
            subjects_with_predictions.append({
                "subject": subject_input.subject,
                "examDate": subject_input.examDate,
                "chapters": subject_input.chapters,
                "avg_chapter_time": subject_input.avg_chapter_time,
                "priority": priority,
                "confidence": float(confidence),
                "daysLeft": days_left
            })
        
        # STEP 1: Generate timetable using the slot-based engine FIRST
        timetable = []
        subject_states = []
        try:
            timetable, subject_states = generate_slot_based_plan(
                subjects_with_predictions,
                request.availableHoursPerDay,
                request.startHour,
                request.endHour,
                request.weeklyAvailability
            )
            print(f"\n Slot-based plan generated: {len(timetable)} sessions, ZERO overlaps guaranteed")
        except Exception as e:
            print(f"\n Slot-based plan failed: {e}")
            traceback.print_exc()

        # STEP 2: Per-subject feasibility + AI recommendations (runs AFTER scheduling to see actual progress)
        feasibility_status, required_daily_hrs, toast_message, detailed_message, ai_recommendations = calculate_feasibility_v2(
            subjects_with_predictions,
            subject_states,
            request.availableHoursPerDay,
            request.weeklyAvailability,
            request.startHour,
            request.endHour
        )
        
        print(f"\n Feasibility: {feasibility_status.upper()}")
        print(f" Toast: {toast_message}")
        for rec in ai_recommendations:
            print(f"   {rec.subjectName}: {rec.hoursNeeded}h needed, {rec.hoursScheduled}h scheduled, covers {rec.chaptersCoverable}/{rec.chaptersTotal} ch")
        
        # STEP 3: If empty, show info
        if not timetable:
            toast_message = " No sessions could be scheduled. Check your availability windows."
            feasibility_status = "impossible"
        
        # STEP 4: Calculate statistics
        total_hours = sum(entry.duration for entry in timetable) if timetable else 0
        subject_names = sorted(list(set(entry.subject for entry in timetable))) if timetable else []
        start_date = timetable[0].date if timetable else ""
        end_date = timetable[-1].date if timetable else ""
        daily_summaries = generate_daily_summaries(timetable) if timetable else []
        
        # STEP 5: Determine final status
        if feasibility_status == "impossible":
            response_status = "warning"
        elif feasibility_status in ["risk", "urgent"]:
            response_status = "warning"
        else:
            response_status = "success"
        
        print("\n" + "-"*60)
        print(f" FINAL PLAN V4:")
        print(f"  Status: {feasibility_status}")
        print(f"  Entries: {len(timetable)}")
        print(f"  Total hours: {total_hours:.1f}")
        print(f"  Date range: {start_date} to {end_date}")
        print(f"  AI Recommendations: {len(ai_recommendations)}")
        print("="*60 + "\n")
        

        return GeneratePlanResponse(
            status=response_status,
            feasibility_status=feasibility_status,
            required_daily_hrs=required_daily_hrs,
            available_daily_hrs=request.availableHoursPerDay,
            message=toast_message,
            detailed_message=detailed_message,
            totalEntries=len(timetable),
            totalHours=round(total_hours, 2),
            subjects=subject_names,
            startDate=start_date,
            endDate=end_date,
            daily_summaries=daily_summaries,
            timetable=timetable,
            ai_recommendations=ai_recommendations
        )
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"Plan generation error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print(" Starting Study Planner API Server v4.0")
    print("="*50)
    print(" Server: http://127.0.0.1:8000")
    print(" Docs: http://127.0.0.1:8000/docs")
    print(" Features: Slot-Based Engine + AI Advisor")
    print("="*50 + "\n")
    
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        log_level="info",
        reload=True
    )