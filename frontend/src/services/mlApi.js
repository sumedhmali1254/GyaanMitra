/**
 * Study Planner ML API Service
 *
 * This module handles all communication with the Python FastAPI server
 * for making priority predictions and getting study recommendations.
 */

// const ML_API_BASE_URL = "http://127.0.0.1:8000";

// [DEPLOYMENT UPDATE]: Use the deployed Render ML service in production.
const ML_API_BASE_URL =
  import.meta.env.VITE_ML_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Check if the ML API is healthy and accessible
 *
 * @returns {Promise<boolean>} True if API is running, false otherwise
 */
export const checkMLHealth = async () => {
  try {
    const response = await fetch(`${ML_API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error("ML API Health Check Failed:", error);
    return false;
  }
};

/**
 * Get ML Model Information
 *
 * @returns {Promise<object>} Model information including type, n_estimators, classes
 */
export const getMLModelInfo = async () => {
  try {
    const response = await fetch(`${ML_API_BASE_URL}/info`);
    if (!response.ok) throw new Error("Failed to fetch model info");
    return await response.json();
  } catch (error) {
    console.error("Error fetching ML model info:", error);
    throw error;
  }
};

/**
 * Predict priority and recommended study hours using ML Model
 *
 * @param {object} studyData - Study information
 * @param {number} studyData.difficulty - Subject difficulty (1-10)
 * @param {string} studyData.examDate - Exam date (YYYY-MM-DD format)
 * @param {number} studyData.pastScore - Previous exam score (0-100)
 * @param {number} studyData.completion - Syllabus completion (0-100)
 * @param {number} studyData.availableHours - Daily available hours (1-12)
 *
 * @returns {Promise<object>} Prediction result
 * @returns {string} result.priority - "high", "normal", or "low"
 * @returns {number} result.recommendedHours - AI-suggested daily hours
 * @returns {number} result.daysLeft - Calculated days until exam
 * @returns {number} result.confidence - Model confidence (0-1)
 *
 * @throws {Error} If API request fails
 *
 * @example
 * const prediction = await predictStudyPriority({
 *   difficulty: 8,
 *   examDate: "2026-03-25",
 *   pastScore: 45,
 *   completion: 30,
 *   availableHours: 3
 * });
 * console.log(prediction);
 * // Output: { priority: "high", recommendedHours: 4, daysLeft: 13, confidence: 0.95 }
 */
export const predictStudyPriority = async (studyData) => {
  try {
    // Validate input data
    if (!studyData.examDate) {
      throw new Error("Exam date is required");
    }

    if (studyData.difficulty < 1 || studyData.difficulty > 10) {
      throw new Error("Difficulty must be between 1 and 10");
    }

    // 5-second timeout so the button never gets stuck
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Make the API request
    const response = await fetch(`${ML_API_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        difficulty: parseInt(studyData.difficulty),
        examDate: studyData.examDate,
        pastScore: parseInt(studyData.pastScore),
        completion: parseInt(studyData.completion),
        availableHours: parseInt(studyData.availableHours),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Prediction failed");
    }

    const prediction = await response.json();

    // Log the prediction for debugging
    console.log("✓ ML Prediction received:", {
      priority: prediction.priority,
      recommendedHours: prediction.recommendedHours,
      daysLeft: prediction.daysLeft,
      confidence: prediction.confidence,
    });

    return prediction;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "ML API server not responding (timeout). Make sure it is running.",
      );
    }
    console.error("Error predicting study priority:", error);
    throw error;
  }
};

/**
 * Format prediction result for UI display
 *
 * @param {object} prediction - Prediction object from API
 * @returns {object} Formatted prediction with display text
 */
export const formatPrediction = (prediction) => {
  const priorityText = {
    high: "High Priority - Study More!",
    normal: "Normal Priority - Balanced Study",
    low: "Low Priority - Light Study",
  };

  const priorityEmoji = {
    high: "🔴",
    normal: "🟡",
    low: "🟢",
  };

  return {
    ...prediction,
    displayText: priorityText[prediction.priority] || "Unknown",
    emoji: priorityEmoji[prediction.priority] || "⚪",
  };
};

/**
 * Get priority color for UI components
 *
 * @param {string} priority - Priority level ("high", "normal", "low")
 * @returns {string} Hex color code
 */
export const getPriorityColor = (priority) => {
  const colors = {
    high: "#ef4444", // Red
    normal: "#f59e0b", // Amber
    low: "#10b981", // Green
  };
  return colors[priority] || "#6b7280"; // Gray as default
};

/**
 * Check if ML API is available (cached with 30 second TTL)
 */
let lastHealthCheck = 0;
let cachedHealthStatus = false;

export const isMLAPIAvailable = async (forceCheck = false) => {
  const now = Date.now();
  const cacheExpiry = 30000; // 30 seconds

  if (!forceCheck && now - lastHealthCheck < cacheExpiry) {
    return cachedHealthStatus;
  }

  try {
    cachedHealthStatus = await checkMLHealth();
    lastHealthCheck = now;
    return cachedHealthStatus;
  } catch {
    cachedHealthStatus = false;
    lastHealthCheck = now;
    return false;
  }
};

/**
 * Generate a weekly study timetable for multiple subjects
 *
 * @param {object} planData - Plan generation request
 * @param {number} planData.availableHoursPerDay - Available hours per day
 * @param {number} planData.startHour - Day start hour (0-23) - kept for backward compatibility
 * @param {number} planData.endHour - Day end hour (0-23) - kept for backward compatibility
 * @param {object} [planData.weeklyAvailability] - Per-day study availability (optional)
 *   Format: { Monday: {enabled: boolean, start: string, end: string}, ... }
 *   Times should be in "HH:MM AM/PM" format (e.g., "07:00 AM", "10:00 PM")
 * @param {Array} planData.subjects - List of subjects with details
 *
 * Each subject should have:
 * - subject: string - Subject name
 * - examDate: string - YYYY-MM-DD format
 * - chapters: number - Number of chapters
 * - avg_chapter_time: number - (optional) Average hours to complete a chapter
 * - beginnerMode: boolean - Is beginner mode enabled
 * - familiarity: string - (beginner mode) 'none', 'little', 'moderate', 'strong'
 * - syllabusSize: string - (beginner mode) 'small', 'medium', 'large'
 * - difficulty: number - (advanced mode) 1-10
 * - pastScore: number - (advanced mode) 0-100
 * - completion: number - (advanced mode) 0-100
 *
 * @returns {Promise<object>} Generated plan response
 * @returns {string} result.status - Status message
 * @returns {number} result.totalEntries - Number of timetable entries
 * @returns {number} result.totalHours - Total hours planned
 * @returns {Array} result.subjects - List of subjects
 * @returns {string} result.startDate - First date in plan
 * @returns {string} result.endDate - Last date in plan
 * @returns {Array} result.timetable - Array of timetable entries
 *
 * @throws {Error} If API request fails or validation fails
 *
 * @example
 * const plan = await generateStudyPlan({
 *   availableHoursPerDay: 4,
 *   startHour: 6,
 *   endHour: 20,
 *   weeklyAvailability: {
 *     Monday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
 *     Tuesday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
 *     Wednesday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
 *     Thursday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
 *     Friday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
 *     Saturday: { enabled: true, start: "07:00 AM", end: "11:00 PM" },
 *     Sunday: { enabled: false, start: "10:00 AM", end: "06:00 PM" }
 *   },
 *   subjects: [
 *     {
 *       subject: "Mathematics",
 *       examDate: "2026-03-25",
 *       chapters: 12,
 *       beginnerMode: false,
 *       difficulty: 7,
 *       pastScore: 65,
 *       completion: 40
 *     }
 *   ]
 * });
 */
export const generateStudyPlan = async (planData) => {
  try {
    // Validate required fields
    if (!planData.availableHoursPerDay || planData.availableHoursPerDay <= 0) {
      throw new Error("Available hours per day must be greater than 0");
    }

    if (!planData.subjects || planData.subjects.length === 0) {
      throw new Error("At least one subject is required");
    }

    // startHour/endHour safety is handled in the request body builder below

    // Validate each subject
    planData.subjects.forEach((subject, index) => {
      if (!subject.subject) {
        throw new Error(`Subject ${index + 1}: Subject name is required`);
      }
      if (!subject.examDate) {
        throw new Error(`Subject ${index + 1}: Exam date is required`);
      }
      if (!subject.chapters || subject.chapters < 1) {
        throw new Error(
          `Subject ${index + 1}: Number of chapters must be at least 1`,
        );
      }

      // Validate beginner/advanced mode fields
      if (subject.beginnerMode) {
        if (
          !["none", "little", "moderate", "strong"].includes(
            subject.familiarity,
          )
        ) {
          throw new Error(
            `Subject ${index + 1}: Familiarity must be 'none', 'little', 'moderate', or 'strong'`,
          );
        }
        if (!["small", "medium", "large"].includes(subject.syllabusSize)) {
          throw new Error(
            `Subject ${index + 1}: Syllabus size must be 'small', 'medium', or 'large'`,
          );
        }
      } else {
        if (
          subject.difficulty === undefined ||
          subject.difficulty < 1 ||
          subject.difficulty > 10
        ) {
          throw new Error(
            `Subject ${index + 1}: Difficulty must be between 1 and 10`,
          );
        }
      }
    });

    // 15-second timeout for plan generation (it takes longer)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Build the request body
    const requestBody = {
      availableHoursPerDay: parseFloat(planData.availableHoursPerDay) || 4,
      startHour: parseInt(planData.startHour) || 6,
      endHour: parseInt(planData.endHour) || 20,
      // Include per-day availability if provided
      ...(planData.weeklyAvailability && {
        weeklyAvailability: planData.weeklyAvailability,
      }),
      subjects: planData.subjects.map((s) => ({
        subject: s.subject,
        examDate: s.examDate,
        chapters: parseInt(s.chapters),
        avg_chapter_time: s.avg_chapter_time
          ? parseFloat(s.avg_chapter_time)
          : null,
        startTime: s.startTime || "06:00 AM",
        endTime: s.endTime || "10:00 PM",
        beginnerMode: Boolean(s.beginnerMode),
        ...(s.beginnerMode
          ? {
              familiarity: s.familiarity || "none",
              syllabusSize: s.syllabusSize || "medium",
            }
          : {
              difficulty: parseInt(s.difficulty) || 5,
              pastScore: parseInt(s.pastScore) || 50,
              completion: parseInt(s.completion) || 50,
            }),
      })),
    };

    // Safety: ensure startHour < endHour
    if (requestBody.startHour >= requestBody.endHour) {
      requestBody.startHour = 6;
      requestBody.endHour = 22;
    }

    // Safety: clamp availableHoursPerDay minimum
    if (requestBody.availableHoursPerDay < 0.5)
      requestBody.availableHoursPerDay = 4;

    console.log(
      "📤 Sending to /generate-plan:",
      JSON.stringify(requestBody, null, 2),
    );

    // Make API request
    const response = await fetch(`${ML_API_BASE_URL}/generate-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.json();
      console.error(
        "❌ API Error Response:",
        JSON.stringify(errorBody, null, 2),
      );
      const detail = errorBody.detail;
      // Pydantic returns detail as array of objects or string
      const message = Array.isArray(detail)
        ? detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join("; ")
        : typeof detail === "string"
          ? detail
          : JSON.stringify(detail);
      throw new Error(message || "Plan generation failed");
    }

    const plan = await response.json();

    // Log the result for debugging
    console.log("✓ Study plan generated:", {
      totalEntries: plan.totalEntries,
      totalHours: plan.totalHours,
      subjects: plan.subjects,
      dateRange: `${plan.startDate} to ${plan.endDate}`,
    });

    return plan;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "ML API server not responding (timeout). Make sure it is running.",
      );
    }
    console.error("Error generating study plan:", error);
    throw error;
  }
};

export default {
  checkMLHealth,
  getMLModelInfo,
  predictStudyPriority,
  generateStudyPlan,
  formatPrediction,
  getPriorityColor,
  isMLAPIAvailable,
};
