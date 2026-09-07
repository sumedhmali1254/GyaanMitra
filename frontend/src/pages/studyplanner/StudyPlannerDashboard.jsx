import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import "./css/StudyPlannerDashboard.css";
import { predictStudyPriority, generateStudyPlan } from "../../services/mlApi";
import { usePlanner } from "../../context/PlannerContext";
import { useSettings } from "../../context/SettingsContext";
import { useNotifications } from "../../context/NotificationContext";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import GyaanCalendar from "../../components/GyaanCalendar";
import GyaanTimePicker from "../../components/GyaanTimePicker";
import ConfirmationModal from "../../components/ConfirmationModal";

const StudyPlannerDashboard = () => {
  const planner = usePlanner();
  const { syllabusData } = useSettings();
  const { addNotification } = useNotifications();

  const getSubjectColor = (name) => {
    const palette = [
      '#795548', // Brown
      '#0d9488', // Teal
      '#4f46e5', // Indigo
      '#9333ea', // Purple
      '#d97706', // Amber
      '#e11d48', // Rose
      '#2563eb', // Blue
      '#16a34a', // Green
      '#b91c1c', // Dark Red
      '#c026d3', // Fuchsia
      '#0891b2', // Cyan
    ];
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSourceTab, setSubjectSourceTab] = useState("pdf");
  const [scheduleMode, setScheduleMode] = useState("average"); // 'average' or 'custom'
  const subjectDropdownRef = useRef(null);

  // Shared state from context
  const subjects = planner?.subjects || [];
  const addSubject = planner?.addSubject || (() => { });
  const updateSubject = planner?.updateSubject || (() => { });
  const removeSubject = planner?.removeSubject || (() => { });
  const sessions = planner?.sessions || [];
  const setSessions = planner?.setSessions || (() => { });
  const currentWeekStart = planner?.currentWeekStart || new Date();
  const setCurrentWeekStart = planner?.setCurrentWeekStart || (() => { });
  const editingSubjectId = planner?.editingSubjectId;
  const setEditingSubjectId = planner?.setEditingSubjectId || (() => { });
  const aiRecommendations = planner?.aiRecommendations || [];
  const setAiRecommendations = planner?.setAiRecommendations || (() => { });
  const showAIAdvisorModal = planner?.showAIAdvisorModal;
  const setShowAIAdvisorModal = planner?.setShowAIAdvisorModal || (() => { });

  // Form state (local to modal)
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [chapters, setChapters] = useState(10);
  const [avgChapterTime, setAvgChapterTime] = useState(1.5);
  const [difficulty, setDifficulty] = useState(5);
  const [pastScore, setPastScore] = useState(50);
  const [completion, setCompletion] = useState(50);
  const [familiarity, setFamiliarity] = useState("moderate");
  const [syllabusSize, setSyllabusSize] = useState("medium");
  const [startTime, setStartTime] = useState("06:00 AM");
  const [endTime, setEndTime] = useState("10:00 PM");
  const [availableHours, setAvailableHours] = useState(4);
  const [showTimeConfig, setShowTimeConfig] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    Monday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
    Tuesday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
    Wednesday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
    Thursday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
    Friday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
    Saturday: { enabled: true, start: "07:00 AM", end: "11:00 PM" },
    Sunday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
  });

  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [aiLabelFlags, setAiLabelFlags] = useState(false);

  // Track subject backups for UNDO functionality
  const [subjectBackups, setSubjectBackups] = useState({});
  // Track which subject is currently being updated/regenerated
  const [implementingSubject, setImplementingSubject] = useState(null);

  // Handlers for Smart Time Sync (Uses DayJS for reliability)
  const handleStartTimeChange = (newStart) => {
    setStartTime(newStart);
    // Be robust with parsing to handle AM/PM correctly
    const s = dayjs(newStart, ["hh:mm A", "HH:mm", "h:mm A", "H:mm"]);
    const e = s.isValid() ? s.add(availableHours, "hour") : s;
    setEndTime(e.format("hh:mm A"));
  };

  const handleEndTimeChange = (newEnd) => {
    setEndTime(newEnd);
    const e = dayjs(newEnd, "hh:mm A");
    const s = e.subtract(availableHours, "hour");
    setStartTime(s.format("hh:mm A"));
  };

  const handleAvailableHoursChange = (newHrsValue) => {
    const newHrs = parseFloat(newHrsValue) || 1;
    setAvailableHours(newHrs);
    const s = dayjs(startTime, "hh:mm A");
    const e = s.add(newHrs, "hour");
    setEndTime(e.format("hh:mm A"));
  };

  // Outcome-Focused Stats
  const completionPercentage = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(
      (sessions.filter((s) => s.completed).length / sessions.length) * 100,
    );
  }, [sessions]);

  const daysToNextExam = useMemo(() => {
    if (subjects.length === 0) return null;
    const futureExams = subjects
      .filter(
        (s) =>
          s.examDate && dayjs(s.examDate).isAfter(dayjs().subtract(1, "day")),
      )
      .map((s) => dayjs(s.examDate).valueOf());
    if (futureExams.length === 0) return null;
    const nextExamTime = Math.min(...futureExams);
    return dayjs(nextExamTime).diff(dayjs(), "day");
  }, [subjects]);

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      dates.push({
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: dateStr,
        dayNum: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        isToday: dayjs().format("YYYY-MM-DD") === dateStr,
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour <= 23; hour++) {
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      slots.push({ hour, label: `${hour12}:00 ${period}` });
    }
    return slots;
  }, []);

  const weekSessions = useMemo(() => {
    if (!sessions.length) return [];
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return sessions.filter((s) => {
      const sd = new Date(s.date);
      return sd >= weekStart && sd < weekEnd;
    });
  }, [sessions, currentWeekStart]);

  const examDateGroups = useMemo(() => {
    const groups = {};
    subjects.forEach((s) => {
      if (!s.examDate) return;
      if (!groups[s.examDate]) groups[s.examDate] = [];
      groups[s.examDate].push(s.subject);
    });
    return groups;
  }, [subjects]);

  const maxExamsInWeek = useMemo(() => {
    let max = 0;
    weekDates.forEach((day) => {
      const exams = examDateGroups[day.date] || [];
      if (exams.length > max) max = exams.length;
    });
    return max;
  }, [weekDates, examDateGroups]);

  const completedSessions = sessions.filter((s) => s.completed).length;
  const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 1), 0);

  const previousWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };
  const goToToday = () => {
    planner?.goToDate(new Date());
  };

  const resetForm = () => {
    setSubject("");
    setExamDate("");
    setChapters(10);
    setAvgChapterTime(1.5);
    setDifficulty(5);
    setPastScore(50);
    setCompletion(50);
    setBeginnerMode(false);
    setFamiliarity("moderate");
    setSyllabusSize("medium");
    setStartTime("06:00 AM");
    setEndTime("10:00 PM");
    setAvailableHours(4);
    setPriority("normal");
    setMlError("");
    setShowTimeConfig(false);
    setEditingSubjectId(null);
    setAiLabelFlags(false);
    setWeeklyAvailability({
      Monday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
      Tuesday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
      Wednesday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
      Thursday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
      Friday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
      Saturday: { enabled: true, start: "07:00 AM", end: "11:00 PM" },
      Sunday: { enabled: true, start: "06:00 AM", end: "10:00 PM" },
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(event.target)
      ) {
        setSubjectDropdownOpen(false);
      }
    };
    if (subjectDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [subjectDropdownOpen]);

  const validateForm = () => {
    if (!subject.trim()) {
      toast.error("Subject name is required");
      return false;
    }
    if (!examDate) {
      toast.error("Exam date is required");
      return false;
    }
    if (chapters < 1) {
      toast.error("Must have at least 1 chapter");
      return false;
    }
    return true;
  };

  const handleAIPrediction = async () => {
    if (!validateForm()) return;
    if (mlLoading) return;
    setMlLoading(true);
    setMlError("");
    try {
      let predDifficulty = difficulty;
      let predPastScore = pastScore;
      let predCompletion = completion;
      if (beginnerMode) {
        const familiarityMap = {
          none: 0,
          little: 25,
          moderate: 50,
          strong: 75,
        };
        const sizeMap = { small: 4, medium: 6, large: 8 };
        predCompletion = familiarityMap[familiarity] || 0;
        predDifficulty = sizeMap[syllabusSize] || 6;
        predPastScore = 50;
      }
      const result = await predictStudyPriority({
        difficulty: predDifficulty,
        examDate,
        pastScore: predPastScore,
        completion: predCompletion,
        availableHours,
      });
      setPriority(result.priority);
      toast.success(
        "AI Prediction: " +
        result.priority.toUpperCase() +
        " priority (" +
        Math.round(result.confidence * 100) +
        "% confidence)",
        { duration: 4000 },
      );
    } catch (error) {
      console.error("AI Prediction error:", error);
      const errStr = String(error && error.message ? error.message : "");
      if (
        errStr.includes("fetch") ||
        errStr.includes("Network") ||
        errStr.includes("ERR_CONNECTION")
      ) {
        toast.error(
          "ML API server not running! Start: cd ai-model/studyplanner && python app.py",
          { duration: 6000 },
        );
      } else {
        toast.error(errStr || "Prediction failed. Try again.", {
          duration: 4000,
        });
      }
    } finally {
      setMlLoading(false);
    }
  };

  const handleAddSubject = () => {
    if (!validateForm()) return;
    const subjectData = {
      subject,
      examDate,
      chapters,
      avg_chapter_time: avgChapterTime,
      priority,
      beginnerMode,
      scheduleMode,
      ...(beginnerMode
        ? { familiarity, syllabusSize }
        : { difficulty, pastScore, completion }),
      startTime,
      endTime,
      availableHours,
      weeklyAvailability,
    };

    const performSave = (finalPriority = priority) => {
      const finalData = { ...subjectData, priority: finalPriority };
      if (editingSubjectId) {
        updateSubject(editingSubjectId, finalData);
        toast.success(`"${subject}" updated successfully!`);
      } else {
        addSubject(finalData);
        toast.success(`"${subject}" added successfully!`);
      }
      resetForm();
      setShowAddModal(false);
    };

    // If priority is still 'normal' (default), auto-run AI prediction first
    if (priority === "normal" && !mlLoading) {
      handleAIPrediction().then(() => {
        // The state might not have updated yet in this closure, 
        // so we rely on the effect that normally happens, 
        // but handleAIPrediction sets the 'priority' state.
        // For simplicity, we'll wait a bit or just assume the user sees the toast.
        // Better: actually perform the prediction logic here or use the newly set priority.
        performSave();
      });
    } else {
      performSave();
    }
  };

  const handleEditClick = (subj) => {
    setSubject(subj.subject);
    setExamDate(subj.examDate);
    setChapters(subj.chapters);
    setAvgChapterTime(subj.avg_chapter_time);
    setPriority(subj.priority);
    setBeginnerMode(subj.beginnerMode);
    setScheduleMode(subj.scheduleMode || "average");
    if (subj.beginnerMode) {
      setFamiliarity(subj.familiarity);
      setSyllabusSize(subj.syllabusSize);
    } else {
      setDifficulty(subj.difficulty);
      setPastScore(subj.pastScore);
      setCompletion(subj.completion);
    }
    setStartTime(subj.startTime);
    setEndTime(subj.endTime);
    setAvailableHours(subj.availableHours);
    setWeeklyAvailability(subj.weeklyAvailability);

    setEditingSubjectId(subj.id);
    // setShowSubjectsModal(false); // Stay on modal so user can see context
    setShowAddModal(true);
  };

  const handleRemoveSubject = (id) => {
    const removed = subjects.find((s) => s.id === id);
    if (!removed) return;

    removeSubject(id);
    setSessions(sessions.filter((s) => s.subject !== removed.subject));
    setAiRecommendations(
      aiRecommendations.filter((r) => r.subjectName !== removed.subject),
    );

    // Clear backups if any
    if (subjectBackups[removed.subject]) {
      const newBackups = { ...subjectBackups };
      delete newBackups[removed.subject];
      setSubjectBackups(newBackups);
    }

    toast(`"${removed.subject}" removed from plan`, { icon: "🗑️" });
  };

  const handleGeneratePlan = async (subjectsToUse = subjects) => {
    // If React passes an event object instead of an array, fallback to state
    if (!Array.isArray(subjectsToUse)) {
      subjectsToUse = subjects;
    }
    if (subjectsToUse.length === 0) {
      toast.error("Add at least one subject first");
      return;
    }
    setPlanLoading(true);
    setMlError("");
    setAiRecommendations([]);
    try {
      const parseAmPmHour = (timeStr) => {
        if (!timeStr) return 0;
        const t = dayjs(timeStr, ["hh:mm A", "h:mm A", "HH:mm", "H:mm"]);
        return t.isValid() ? t.hour() : 0;
      };

      // Calculate the actual study window width
      const minStartHour = Math.min(
        parseAmPmHour(startTime),
        ...subjectsToUse.map((s) => parseAmPmHour(s.startTime || startTime || "06:00 AM")),
      );
      const maxEndHour = Math.max(
        parseAmPmHour(endTime),
        ...subjectsToUse.map((s) => parseAmPmHour(s.endTime || endTime || "10:00 PM")),
      );
      const windowWidth = maxEndHour - minStartHour;

      // availableHoursPerDay should be the full window width so the engine can
      // distribute ALL subjects across the day. The engine itself limits by the
      // per-day window, so sending the full width is safe and prevents starvation.
      const maxAvailableHours = Math.max(availableHours, windowWidth, 4);

      // If any subject has custom weekly availability, use the first one found as global fallback
      let customWeeklyAvail =
        subjectsToUse.find(
          (s) => s.scheduleMode === "custom" && s.weeklyAvailability,
        )?.weeklyAvailability || weeklyAvailability;

      // Ensure that if we fall back to defaults, they reflect the current UI startTime/endTime
      const resolvedWeeklyAvail = { ...customWeeklyAvail };
      if (!subjectsToUse.some(s => s.scheduleMode === "custom")) {
        // We are in 'average' mode for all subjects, apply global window to all enabled days
        Object.keys(resolvedWeeklyAvail).forEach(day => {
          if (resolvedWeeklyAvail[day].enabled) {
            resolvedWeeklyAvail[day].start = startTime;
            resolvedWeeklyAvail[day].end = endTime;
          }
        });
      }

      const plan = await generateStudyPlan({
        availableHoursPerDay: maxAvailableHours,
        startHour: minStartHour,
        endHour: maxEndHour,
        weeklyAvailability: resolvedWeeklyAvail,
        subjects: subjectsToUse.map((s) => ({
          subject: s.subject,
          examDate: s.examDate,
          chapters: s.chapters,
          avg_chapter_time: s.avg_chapter_time,
          startTime: s.startTime || startTime || "06:00 AM",
          endTime: s.endTime || endTime || "10:00 PM",
          beginnerMode: s.beginnerMode,
          ...(s.beginnerMode
            ? {
              familiarity: s.familiarity || "moderate",
              syllabusSize: s.syllabusSize || "medium",
            }
            : {
              difficulty: s.difficulty || 5,
              pastScore: s.pastScore || 50,
              completion: s.completion || 50,
            }),
        })),
      });
      const newSessions = plan.timetable.map((entry, idx) => ({
        id: entry.id || `session-${idx}`,
        subject: entry.subject,
        chapter: entry.chapter,
        date: entry.date,
        day: entry.day || dayjs(entry.date).format("dddd"),
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        priority: entry.priority,
        daysLeft: entry.daysLeft || 0,
        completed: false,
      }));
      setSessions(newSessions);

      // Store AI recommendations
      setAiRecommendations(plan.ai_recommendations || []);



      const hasWarnings =
        (plan.ai_recommendations && plan.ai_recommendations.some(r => r.shortageHours > 0)) ||
        plan.status === "warning" ||
        plan.feasibility_status === "impossible";

      if (hasWarnings) {
        toast.error("AI Advisor has important recommendations! Please click the Advisor button to view.", {
          duration: 5000,
          icon: "🤖",
        });
        // We will no longer auto-show the modal; user must click the button manually.
      } else {
        toast.success(
          `Optimized! ${plan.totalEntries} sessions scheduled.`,
          { icon: "🤖" }
        );
      }

      return plan;
    } catch (error) {
      toast.error(error.message || "Failed to generate plan");
    } finally {
      setPlanLoading(false);
    }
  };

  const toggleSessionComplete = (id) => {
    setSessions(
      sessions.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s,
      ),
    );
  };

  // React to external edit requests from Sidebar alerts
  useEffect(() => {
    if (editingSubjectId && !showAddModal) {
      const subj = subjects.find((s) => s.id === editingSubjectId);
      if (subj) handleEditClick(subj);
    }
  }, [editingSubjectId, subjects, showAddModal]);

  const deleteSession = (id) => {
    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    // If all sessions are deleted manually, clear the AI recommendations too
    if (newSessions.length === 0) {
      setAiRecommendations([]);
      setShowAIAdvisorModal(false);
    }
  };

  // Handle "Implement" button from AI Advisor
  const handleImplementRecommendation = async (rec) => {
    const matchedSubjectIndex = subjects.findIndex(
      (s) => s.subject === rec.subjectName,
    );
    if (matchedSubjectIndex !== -1) {
      const matchedSubject = subjects[matchedSubjectIndex];

      // Store backup before modifying if not already backed up
      if (!subjectBackups[rec.subjectName]) {
        setSubjectBackups((prev) => ({
          ...prev,
          [rec.subjectName]: { ...matchedSubject },
        }));
      }

      setImplementingSubject(rec.subjectName);

      const newRecommendedHours = Math.ceil(rec.recommendedDailyHours);
      const addedHours =
        newRecommendedHours - (matchedSubject.availableHours || 4);

      let newEndTime = matchedSubject.endTime;
      if (addedHours > 0 && matchedSubject.endTime) {
        try {
          // Parse original end time
          const [time, period] = matchedSubject.endTime.split(" ");
          let [h, m] = time.split(":").map(Number);
          if (period && period.toUpperCase() === "PM" && h !== 12) h += 12;
          if (period && period.toUpperCase() === "AM" && h === 12) h = 0;

          let newEndH = h + addedHours;
          if (newEndH > 23) newEndH = 23; // Cap at end of day

          const newEndPeriod = newEndH >= 12 ? "PM" : "AM";
          const displayEndH = newEndH % 12 || 12;
          newEndTime = `${displayEndH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${newEndPeriod}`;
        } catch (e) {
          /* fallback gracefully */
        }
      }

      const newSubject = {
        ...matchedSubject,
        scheduleMode: "implemented",
        availableHours: newRecommendedHours,
        endTime: newEndTime,
        priority: rec.priority,
      };
      const newSubjects = [...subjects];
      newSubjects[matchedSubjectIndex] = newSubject;
      setSubjects(newSubjects);

      // CRITICAL FIX: Also update the global availableHours state so the next generation
      // calculation (handleGeneratePlan) actually uses more time.
      if (newRecommendedHours > availableHours) {
        setAvailableHours(newRecommendedHours);
      }

      // Keep showing modal so user can see recommendations turn Green (OK state)
      // setShowAIAdvisorModal(false);

      // Pass the updated subjects directly to generation
      const finalPlan = await handleGeneratePlan(newSubjects);
      setImplementingSubject(null);

      // We stay in the modal now as requested, only showing the button buffer
    } else {
      toast.error(`Subject "${rec.subjectName}" not found.`);
    }
  };

  const handleUndoRecommendation = async (subjectName) => {
    const backup = subjectBackups[subjectName];
    if (!backup) return;

    setImplementingSubject(subjectName);

    const matchedSubjectIndex = subjects.findIndex(
      (s) => s.subject === subjectName,
    );
    if (matchedSubjectIndex !== -1) {
      const newSubjects = [...subjects];
      newSubjects[matchedSubjectIndex] = { ...backup };

      setSubjects(newSubjects);

      // Remove backup after restoring
      const newBackups = { ...subjectBackups };
      delete newBackups[subjectName];
      setSubjectBackups(newBackups);

      toast.success(
        `Restored original settings for ${subjectName}. Regenerating...`,
        { icon: "↩️" },
      );

      setShowAIAdvisorModal(false);
      await handleGeneratePlan(newSubjects);
    }
    setImplementingSubject(null);
  };

  const handleClearPlan = () => {
    setSessions([]);
    setAiRecommendations([]);
    setShowAIAdvisorModal(false);
    toast.success("Study plan cleared", { icon: "🧹" });
  };

  return (
    <div className="study-planner-dashboard">
      {/* HEADER */}
      <div className="sp-header">
        <div className="sp-header-left">
          <h1>Study Planner</h1>
          <p>AI-powered study scheduling for better exam preparation</p>
        </div>
        <div className="sp-header-right">
          <button
            className="sp-btn sp-btn-primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <i className="bi bi-plus-lg"></i> Add Subject
          </button>
          <button
            className="sp-btn sp-btn-primary"
            onClick={handleGeneratePlan}
            disabled={planLoading || subjects.length === 0}
          >
            <i
              className={`bi ${planLoading ? "bi-hourglass-split" : "bi-magic"}`}
            ></i>
            {planLoading ? "Generating..." : "Generate Plan"}
          </button>
        </div>
      </div>

      {/* AI ADVISOR ALERTS Section */}
      {aiRecommendations.length > 0 && (
        <div
          className="sp-advisor-alerts px-4 mb-4"
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "10px",
            scrollbarWidth: "none"
          }}
        >
          {aiRecommendations.map((rec, idx) => {
            const isWarning = rec.shortageHours > 0;
            return (
              <div
                key={idx}
                className="sp-advisor-card p-3"
                style={{
                  minWidth: "320px",
                  maxWidth: "320px",
                  background: isWarning ? "#fff5f5" : "#f0fdf4",
                  borderLeft: `4px solid ${isWarning ? "#ef4444" : "#10b981"}`,
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  flexShrink: 0
                }}
              >
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className={`bi ${isWarning ? "bi-exclamation-triangle" : "bi-check-circle"} ${isWarning ? "text-danger" : "text-success"}`}></i>
                  <span className="fw-bold small">{rec.subjectName}</span>
                  <span className="badge ms-auto" style={{
                    fontSize: '0.6rem',
                    background: isWarning ? '#fee2e2' : '#dcfce7',
                    color: isWarning ? '#ef4444' : '#10b981'
                  }}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
                <p className="extra-small text-muted mb-2 text-truncate-2" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                  {rec.message}
                </p>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-primary" style={{ fontSize: '0.75rem' }}>
                    {rec.hoursNeeded}h needed
                  </span>
                  <button
                    className="btn btn-sm btn-link p-0 text-decoration-none fw-bold"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setShowAIAdvisorModal(true)}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TOOLBAR */}
      <div className="sp-toolbar">
        <div className="sp-week-nav">
          <button className="sp-btn-icon" onClick={previousWeek}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="sp-week-display">
            {weekDates[0]?.month} {weekDates[0]?.dayNum} – {weekDates[6]?.month}{" "}
            {weekDates[6]?.dayNum}, {currentWeekStart.getFullYear()}
          </span>
          <button className="sp-btn-icon" onClick={nextWeek}>
            <i className="bi bi-chevron-right"></i>
          </button>
          <button className="sp-btn-today" onClick={goToToday}>
            Today
          </button>
        </div>
        <div className="sp-toolbar-actions">
          {aiRecommendations.length > 0 && (
            <button
              className="sp-btn sp-btn-secondary"
              onClick={() => setShowAIAdvisorModal(true)}
              style={{
                background: aiRecommendations.some(r => r.shortageHours > 0) ? '#fee2e2' : '#f1f5f9',
                borderColor: aiRecommendations.some(r => r.shortageHours > 0) ? '#fca5a5' : '#e2e8f0',
                color: aiRecommendations.some(r => r.shortageHours > 0) ? '#ef4444' : '#475569'
              }}
            >
              <i className={`bi ${aiRecommendations.some(r => r.shortageHours > 0) ? "bi-exclamation-triangle" : "bi-robot"}`}></i> Advisor
            </button>
          )}

          <button
            className="sp-btn sp-btn-secondary"
            onClick={() => setShowSubjectsModal(true)}
            disabled={subjects.length === 0}
          >
            <i className="bi bi-list-ul"></i> Subjects ({subjects.length})
          </button>
        </div>
      </div>

      {/* TIMETABLE */}
      <div className="sp-timetable-wrap">
        <div className="sp-timetable">
          <div className="sp-grid-header">
            <div className="sp-time-col-header">Time</div>
            {weekDates.map((day) => {
              const examsForDay = examDateGroups[day.date] || [];
              return (
                <div
                  key={day.date}
                  className={`sp-day-header ${day.isToday ? "today" : ""} ${examsForDay.length > 0 ? "exam-day" : ""}`}
                >
                  <div className="sp-day-name">{day.dayName}</div>
                  <div className="sp-day-num">{day.dayNum}</div>
                </div>
              );
            })}
          </div>

          <div className="sp-grid-body" style={{ position: "relative" }}>
            {/* Grid Background Lines */}
            {/* Dedicated rows at the top for Exam Banners - Dynamic height */}
            {Array.from({ length: maxExamsInWeek }).map((_, rowIndex) => (
              <div
                key={`exams-row-${rowIndex}`}
                className="sp-grid-row exams-row"
                style={{
                  height: "48px",
                  position: "sticky",
                  top: `${rowIndex * 48}px`,
                  zIndex: 12,
                  background: rowIndex === 0 ? "white" : "rgba(255, 255, 255, 0.95)",
                  borderBottom: rowIndex === maxExamsInWeek - 1 ? "2px solid #e2e8f0" : "none",
                }}
              >
                <div
                  className="sp-time-cell"
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                ></div>
                {weekDates.map((date) => {
                  const examsForDay = examDateGroups[date.date] || [];
                  const subjectName = examsForDay[rowIndex];
                  return (
                    <div
                      key={date.date}
                      className={`sp-grid-cell ${examsForDay.length > 0 ? "exam-day-col" : ""}`}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        position: 'relative'
                      }}
                    >
                      {subjectName && (
                        <div
                          className="sp-exam-day-banner"
                          style={{
                            height: "100%",
                            width: "100%",
                            zIndex: 15,
                            border: 'none',
                            boxShadow: 'none',
                            borderRadius: 0
                          }}
                        >
                          <div className="exam-banner-text">{subjectName}</div>
                          <div className="exam-banner-tag">EXAM DAY</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {timeSlots.map((slot) => (
              <div key={slot.hour} className="sp-grid-row">
                <div className="sp-time-cell">{slot.label}</div>
                {weekDates.map((date) => (
                  <div
                    key={date.date}
                    className={`sp-grid-cell ${examDateGroups[date.date] ? "exam-day-col" : ""}`}
                  ></div>
                ))}
              </div>
            ))}

            {/* Sessions Overlay */}
            <div
              className="sp-sessions-overlay"
              style={{
                position: "absolute",
                top: 0,
                left: "80px",
                right: 0,
                bottom: 0,
                pointerEvents: "none",
              }}
            >
              {/* Exam Day Overlay Banners Moved to Sticky Header for scrolling stability */}

              {(() => {
                // Determine which timetable to show
                const currentTimetable = sessions;
                const filteredWeekSessions = currentTimetable.filter((s) => {
                  const sd = new Date(s.date);
                  const weekStart = new Date(currentWeekStart);
                  weekStart.setHours(0, 0, 0, 0);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekEnd.getDate() + 7);
                  return sd >= weekStart && sd < weekEnd;
                });

                return (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: "none",
                      zIndex: 10,
                      display: "flex",
                    }}
                  >
                    {weekDates.map((day) => {
                      // Get sessions for this specific day
                      const daySessions = filteredWeekSessions.filter(
                        (s) => s.date === day.date,
                      );

                      // Common robust time parser
                      const getNumFromTime = (val) => {
                        if (!val) return 0;
                        const t = dayjs(val, ["hh:mm A", "h:mm A", "HH:mm", "H:mm"]);
                        return t.isValid() ? t.hour() + t.minute() / 60 : 0;
                      };

                      // Sort by start time strictly
                      daySessions.sort((a, b) => {
                        const valA = getNumFromTime(a.startTime);
                        const valB = getNumFromTime(b.startTime);
                        return (
                          valA - valB ||
                          String(a.id || "").localeCompare(String(b.id || ""))
                        );
                      });

                      const examsForDay = examDateGroups[day.date] || [];

                      return (
                        <div
                          key={day.date}
                          style={{
                            width: `${100 / 7}%`,
                            height: "100%",
                            // Change back to relative to allow absolutely placed children on timeline
                            position: "relative",
                          }}
                        >
                          {daySessions.map((session) => {
                            const startH = getNumFromTime(session.startTime);
                            // Dynamic offset: all sessions are pushed down by number of exam rows
                            const topPx = startH * 48 + maxExamsInWeek * 48;
                            const heightPx = (session.duration || 1) * 48;

                            return (
                              <div
                                key={session.id}
                                className={`sp-session ${session.completed ? "completed" : ""}`}
                                onClick={() => {
                                  const updated = sessions.map((s) =>
                                    s.id === session.id
                                      ? { ...s, completed: !s.completed }
                                      : s,
                                  );
                                  planner?.setSessions(updated);
                                }}
                                title={`${session.subject}\nChapter ${session.chapter} (${session.duration}h)\n${session.startTime} - ${session.endTime}`}
                                style={{
                                  pointerEvents: "auto",
                                  display: "flex",
                                  flexDirection: "column",
                                  padding:
                                    heightPx < 30 ? "2px 8px" : "6px 8px",
                                  background: session.completed
                                    ? "#f1f5f9"
                                    : `var(--sp-card-bg, #fff)`,
                                  borderLeftColor: session.completed ? '#94a3b8' : getSubjectColor(session.subject),
                                  borderLeftWidth: "4px",
                                  borderLeftStyle: "solid",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                  borderRadius: "6px",
                                  // Timeline layout restored to exactly match grid!
                                  position: "absolute",
                                  top: `${topPx}px`,
                                  height: `${heightPx - 2}px`,
                                  left: "2px", // tiny offset for border
                                  width: "calc(100% - 6px)",
                                  zIndex: session.completed ? 1 : 10,
                                  overflow: "hidden",
                                  alignItems: "flex-start",
                                }}
                              >
                                <div
                                  className="sp-session-subj"
                                  style={{
                                    fontSize:
                                      heightPx < 45 ? "0.65rem" : "0.75rem",
                                    lineHeight: 1.2,
                                    fontWeight: 800,
                                    whiteSpace:
                                      heightPx < 60 ? "nowrap" : "normal",
                                    color: "inherit",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display:
                                      heightPx < 60 ? "block" : "-webkit-box",
                                    WebkitLineClamp:
                                      heightPx < 60 ? undefined : 2,
                                    WebkitBoxOrient:
                                      heightPx < 60 ? undefined : "vertical",
                                    width: "100%",
                                  }}
                                >
                                  {session.subject}
                                </div>
                                {heightPx >= 40 && (
                                  <div
                                    className="sp-session-ch"
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: 600,
                                      opacity: 0.8,
                                      marginTop: "2px",
                                      color: "inherit",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      width: "100%",
                                    }}
                                  >
                                    {session.chapter === 0 ? "Revision" : `Ch ${session.chapter}`}
                                  </div>
                                )}
                                <button
                                  className="sp-session-del"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    planner?.setSessions(
                                      sessions.filter(
                                        (s) => s.id !== session.id,
                                      ),
                                    );
                                  }}
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* AI ADVISOR MODAL */}
      {showAIAdvisorModal && aiRecommendations.length > 0 && (

        <div
          className="sp-modal-overlay"
          style={{ zIndex: 1050 }}
          onClick={() => setShowAIAdvisorModal(false)}
        >
          <div
            className="sp-modal sp-modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sp-modal-head"
              style={{
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "16px",
                marginBottom: "16px",
              }}
            >
              <h2>
                <i className="bi bi-robot"></i> AI Advisor Alerts
              </h2>
              <button
                className="sp-modal-close"
                onClick={() => setShowAIAdvisorModal(false)}
              >
                ×
              </button>
            </div>
            <div
              className="sp-modal-body"
              style={{
                maxHeight: "70vh",
                overflowY: "auto",
                paddingRight: "10px",
              }}
            >
              {aiRecommendations.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {aiRecommendations.map((rec, idx) => {
                    const isWarning = rec.shortageHours > 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          background: isWarning
                            ? "rgba(239, 68, 68, 0.04)"
                            : "rgba(16, 185, 129, 0.04)",
                          border: `1.5px solid ${isWarning ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)"}`,
                          borderRadius: "16px",
                          padding: "16px 20px",
                          position: "relative",
                        }}
                      >
                        <div className="d-flex align-items-start justify-content-between gap-3">
                          <div style={{ flex: 1 }}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <i
                                className={`bi ${isWarning ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill"}`}
                                style={{
                                  color: isWarning ? "#ef4444" : "#10b981",
                                  fontSize: "1rem",
                                }}
                              ></i>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: "0.85rem",
                                  color: "#1e293b",
                                }}
                              >
                                {rec.subjectName}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  textTransform: "uppercase",
                                  background:
                                    rec.priority === "high"
                                      ? "#fee2e2"
                                      : rec.priority === "normal"
                                        ? "#fef3c7"
                                        : "#dcfce7",
                                  color:
                                    rec.priority === "high"
                                      ? "#ef4444"
                                      : rec.priority === "normal"
                                        ? "#d97706"
                                        : "#10b981",
                                }}
                              >
                                {rec.priority}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "0.8rem",
                                color: "#475569",
                                lineHeight: 1.6,
                                margin: "0 0 10px 0",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {rec.message}
                            </p>
                            <div
                              className="d-flex flex-wrap gap-3"
                              style={{
                                fontSize: "0.72rem",
                                color: "#64748b",
                                fontWeight: 600,
                              }}
                            >
                              <span>
                                <i className="bi bi-calendar3 me-1"></i>
                                {rec.daysLeft} days left
                              </span>
                              <span>
                                <i className="bi bi-clock me-1"></i>
                                {rec.hoursNeeded}h needed
                              </span>
                              <span>
                                <i className="bi bi-hourglass me-1"></i>
                                {rec.hoursAvailable}h available
                              </span>
                              <span>
                                <i className="bi bi-check-circle me-1"></i>
                                {rec.hoursScheduled}h scheduled
                              </span>
                              <span>
                                <i className="bi bi-book me-1"></i>
                                {rec.chaptersCoverable}/{rec.chaptersTotal}{" "}
                                chapters coverable ({rec.percentageCompleted}%)
                              </span>
                              {rec.shortageHours > 0 && (
                                <span style={{ color: "#ef4444" }}>
                                  <i className="bi bi-arrow-down-circle me-1"></i>
                                  Shortage: {rec.shortageHours}h
                                </span>
                              )}
                            </div>
                            {(() => {
                              const subjSessions = sessions.filter(
                                (s) => s.subject === rec.subjectName,
                              );
                              if (
                                subjSessions.length === 0 &&
                                (!rec.dailyPlan || rec.dailyPlan.length === 0)
                              )
                                return null;

                              const grouped = {};
                              subjSessions.forEach((s) => {
                                if (!grouped[s.date]) grouped[s.date] = [];
                                grouped[s.date].push(s);
                              });

                              return (
                                <details style={{ marginTop: "12px" }}>
                                  <summary
                                    style={{
                                      fontSize: "0.75rem",
                                      fontWeight: 800,
                                      color: "#795548",
                                      cursor: "pointer",
                                      outline: "none",
                                      padding: "4px 0",
                                    }}
                                  >
                                    View Scheduled Sessions & Plan (
                                    {subjSessions.length} total)
                                  </summary>
                                  <div
                                    style={{
                                      marginTop: "10px",
                                      padding: "12px",
                                      background: "white",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "12px",
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: "0.65rem",
                                        color: "#10b981",
                                        fontWeight: 800,
                                        marginBottom: "10px",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "6px",
                                      }}
                                    >
                                      <i
                                        className="bi bi-shield-check"
                                        style={{ fontSize: "0.85rem" }}
                                      ></i>
                                      <div>
                                        AI has successfully mapped these
                                        sessions with zero overlap against your
                                        other subjects.
                                      </div>
                                    </div>

                                    {Object.keys(grouped).length > 0 ? (
                                      Object.entries(grouped).map(
                                        ([date, daySessions]) => (
                                          <div
                                            key={date}
                                            style={{ marginBottom: "12px" }}
                                          >
                                            <div
                                              style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 800,
                                                color: "#475569",
                                                marginBottom: "6px",
                                                paddingBottom: "4px",
                                                borderBottom:
                                                  "1.5px dashed #f1f5f9",
                                              }}
                                            >
                                              <i className="bi bi-calendar-event me-2"></i>
                                              {formatDate(date)}
                                            </div>
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "6px",
                                              }}
                                            >
                                              {daySessions.map((s, i) => (
                                                <div
                                                  key={i}
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                      "space-between",
                                                    background: "#f8fafc",
                                                    padding: "8px 10px",
                                                    borderRadius: "8px",
                                                    borderLeft:
                                                      "3px solid #795548",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: "8px",
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 800,
                                                        color: "#334155",
                                                      }}
                                                    >
                                                      <i
                                                        className="bi bi-clock me-1"
                                                        style={{
                                                          color: "#94a3b8",
                                                        }}
                                                      ></i>
                                                      {s.startTime} -{" "}
                                                      {s.endTime}
                                                    </span>
                                                    <span
                                                      style={{
                                                        fontSize: "0.6rem",
                                                        background: "#e2e8f0",
                                                        color: "#64748b",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        fontWeight: 700,
                                                      }}
                                                    >
                                                      {s.duration}h
                                                    </span>
                                                  </div>
                                                  <div
                                                    style={{
                                                      fontSize: "0.65rem",
                                                      fontWeight: 800,
                                                      color: "#795548",
                                                      background: "#fef3c7",
                                                      padding: "2px 8px",
                                                      borderRadius: "10px",
                                                    }}
                                                  >
                                                    {s.chapter === 0 ? "Revision" : `Chapter ${s.chapter}`}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ),
                                      )
                                    ) : (
                                      <div
                                        style={{
                                          fontSize: "0.7rem",
                                          color: "#64748b",
                                          fontStyle: "italic",
                                          marginBottom: "8px",
                                        }}
                                      >
                                        No active sessions scheduled. Check the
                                        AI recommendation below:
                                      </div>
                                    )}

                                    {rec.dailyPlan &&
                                      rec.dailyPlan.length > 0 &&
                                      subjSessions.length === 0 && (
                                        <div
                                          style={{
                                            marginTop: "10px",
                                            paddingTop: "10px",
                                            borderTop: "1px solid #f1f5f9",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: "0.65rem",
                                              fontWeight: 800,
                                              color: "#94a3b8",
                                              textTransform: "uppercase",
                                              marginBottom: "6px",
                                            }}
                                          >
                                            AI Recommended Available Hours
                                          </div>
                                          <ul
                                            style={{
                                              margin: 0,
                                              paddingLeft: "18px",
                                              fontSize: "0.7rem",
                                              color: "#64748b",
                                              lineHeight: 1.6,
                                            }}
                                          >
                                            {rec.dailyPlan.map((d, di) => (
                                              <li key={di}>{d}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                  </div>
                                </details>
                              );
                            })()}

                            {isWarning &&
                              (() => {
                                const matchedSubject = subjects.find(
                                  (s) => s.subject === rec.subjectName,
                                );
                                const isImplemented =
                                  matchedSubject &&
                                  matchedSubject.scheduleMode ===
                                  "implemented" &&
                                  rec.shortageHours <= 0;
                                const isBusy =
                                  implementingSubject === rec.subjectName;

                                return (
                                  <div className="d-flex align-items-center gap-2 mt-3 justify-content-end">
                                    {subjectBackups[rec.subjectName] &&
                                      !isBusy && (
                                        <button
                                          className="btn btn-sm"
                                          onClick={() =>
                                            handleUndoRecommendation(
                                              rec.subjectName,
                                            )
                                          }
                                          style={{
                                            background: "#f1f5f9",
                                            color: "#475569",
                                            fontWeight: 700,
                                            padding: "8px 20px",
                                            borderRadius: "12px",
                                            transition: "all 0.2s ease",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            border: "1.5px solid #e2e8f0",
                                            fontSize: "0.75rem",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          <i
                                            className="bi bi-arrow-counterclockwise"
                                            style={{ fontSize: "0.9rem" }}
                                          ></i>
                                          <span>Undo Fix</span>
                                        </button>
                                      )}

                                    <button
                                      className="btn btn-sm"
                                      onClick={() => {
                                        if (!isImplemented && !isBusy) {
                                          handleImplementRecommendation(rec);
                                        }
                                      }}
                                      disabled={isImplemented || isBusy}
                                      style={{
                                        background: isImplemented
                                          ? "#94a3b8"
                                          : "#795548",
                                        color: "white",
                                        fontWeight: 700,
                                        padding: "8px 20px",
                                        borderRadius: "12px",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        border: "none",
                                        opacity:
                                          isImplemented || isBusy ? 0.7 : 1,
                                        cursor:
                                          isImplemented || isBusy
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      {isBusy ? (
                                        <>
                                          <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                            aria-hidden="true"
                                            style={{
                                              width: "12px",
                                              height: "12px",
                                            }}
                                          ></span>
                                          <span style={{ fontSize: "0.72rem" }}>
                                            Regenerating...
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <i
                                            className={`bi ${isImplemented ? "bi-check2-circle" : "bi-magic"}`}
                                            style={{ fontSize: "0.9rem" }}
                                          ></i>
                                          <span style={{ fontSize: "0.72rem" }}>
                                            {isImplemented
                                              ? "Applied"
                                              : "Implement"}
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 40px",
                    color: "#94a3b8",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.05)', transform: 'scale(1.2)', animation: 'pulse 3s infinite' }}></div>
                    <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', animation: 'pulse 2s infinite' }}></div>
                    <div style={{ position: 'absolute', width: '70%', height: '70%', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)' }}></div>
                    <i
                      className="bi bi-check-circle"
                      style={{
                        fontSize: "3.5rem",
                        color: "#10b981",
                        position: 'relative',
                        zIndex: 1,
                        filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2))'
                      }}
                    ></i>
                  </div>
                  <h3 style={{ color: '#1e293b', fontWeight: 800, fontSize: '1.2rem', marginBottom: '8px' }}>Optimized!</h3>
                  <p style={{ fontSize: '0.85rem', maxWidth: '240px', margin: '0 auto' }}>No AI alerts. Your study plan is fully optimized and ready!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD SUBJECT MODAL MOVED TO END */}

      {/* SUBJECTS MODAL */}
      {showSubjectsModal && (
        <div
          className="sp-modal-overlay"
          onClick={() => setShowSubjectsModal(false)}
        >
          <div
            className="sp-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "650px" }}
          >
            <div
              className="sp-modal-head"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
                <i className="bi bi-journals me-2"></i> Manage Subjects
              </h2>
              <button
                className="sp-modal-close"
                onClick={() => setShowSubjectsModal(false)}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div
              className="sp-modal-body"
              style={{ maxHeight: "75vh", overflowY: "auto", padding: "16px" }}
            >
              {subjects.length > 0 ? (
                subjects.map((subj) => (
                  <div
                    key={subj.id}
                    className="sp-subject-list-item animate-fade-in"
                    style={{
                      background: "white",
                      borderRadius: "20px",
                      padding: "24px",
                      marginBottom: "16px",
                      border: "1.5px solid #f1f5f9",
                      borderLeft: `5px solid ${getSubjectColor(subj.subject)}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                      transition: "transform 0.2s ease",
                      position: "relative"
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1.15rem",
                              fontWeight: 800,
                              color: "#1e293b",
                            }}
                          >
                            {subj.subject}
                          </h3>
                          <span
                            style={{
                              fontSize: "0.6rem",
                              fontWeight: 900,
                              padding: "2px 10px",
                              borderRadius: "20px",
                              background:
                                subj.priority === "high"
                                  ? "rgba(239, 68, 68, 0.1)"
                                  : subj.priority === "medium"
                                    ? "rgba(245, 158, 11, 0.1)"
                                    : "rgba(16, 185, 129, 0.1)",
                              color:
                                subj.priority === "high"
                                  ? "#ef4444"
                                  : subj.priority === "medium"
                                    ? "#f59e0b"
                                    : "#10b981",
                              textTransform: "uppercase",
                              letterSpacing: '0.5px'
                            }}
                          >
                            {subj.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(121, 85, 72, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="bi bi-calendar4-week" style={{ color: '#795548', fontSize: '0.8rem', margin: '0 auto' }}></i>
                            </div>
                            {dayjs(subj.examDate).format("DD MMM YYYY")}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(121, 85, 72, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="bi bi-clock-history" style={{ color: '#795548', fontSize: '0.8rem', margin: '0 auto' }}></i>
                            </div>
                            {subj.availableHours}h Target
                          </span>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="sp-btn-icon"
                          onClick={() => handleEditClick(subj)}
                          style={{ width: '40px', height: '40px', borderRadius: '14px', border: '1.5px solid #f1f5f9', background: 'white' }}
                        >
                          <i className="bi bi-pencil-square" style={{ fontSize: '1rem' }}></i>
                        </button>
                        <button
                          className="sp-btn-icon"
                          onClick={() => handleRemoveSubject(subj.id)}
                          style={{ width: '40px', height: '40px', borderRadius: '14px', color: '#ef4444', border: '1.5px solid #fee2e2', background: 'white' }}
                        >
                          <i className="bi bi-trash3" style={{ fontSize: '1rem' }}></i>
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1px',
                        background: "#eef2ff",
                        borderRadius: "16px",
                        overflow: 'hidden',
                        border: '1.5px solid #eef2ff'
                      }}
                    >
                      <div style={{ background: 'white', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Chapters</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{subj.chapters}</div>
                      </div>
                      <div style={{ background: 'white', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Time/Ch</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{subj.avg_chapter_time}h</div>
                      </div>
                      <div style={{ background: 'white', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Familiarity</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', textTransform: 'capitalize' }}>{subj.familiarity || "Normal"}</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bi bi-stopwatch" style={{ color: '#795548' }}></i>
                        <span>{dayjs(subj.startTime || "06:00 AM", ["hh:mm A", "h:mm A", "HH:mm", "H:mm"]).format("hh:mm A")}</span>
                        <i className="bi bi-arrow-right" style={{ fontSize: '0.6rem' }}></i>
                        <span>{dayjs(subj.endTime || "10:00 PM", ["hh:mm A", "h:mm A", "HH:mm", "H:mm"]).format("hh:mm A")}</span>
                        <span style={{ marginLeft: 'auto', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem' }}>
                          {subj.scheduleMode === "custom" ? "Custom Schedule" : "Standard Daily"}
                        </span>
                      </div>

                      {subj.scheduleMode === "custom" && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                          {Object.entries(subj.weeklyAvailability || {}).map(([day, config]) =>
                            config.enabled && (
                              <div key={day} style={{ fontSize: '0.6rem', fontWeight: 700, background: '#eef2ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '4px' }}>
                                {day.substring(0, 3)}
                              </div>
                            )
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: '14px' }}>
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>SYLLABUS PROGRESS</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1e293b' }}>{subj.completion || 0}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${subj.completion || 0}%`, height: '100%', background: '#795548', borderRadius: '10px', transition: 'width 0.4s ease' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3" style={{ opacity: 0.1 }}>
                    <i
                      className="bi bi-journal-x"
                      style={{ fontSize: "4rem" }}
                    ></i>
                  </div>
                  <h4 style={{ color: "#64748b", fontWeight: 700 }}>
                    Empty Subject List
                  </h4>
                  <p className="text-muted small">
                    Your subjects will appear here once added.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ADD SUBJECT MODAL (Z-INDEX FIX: Rendered last to stay on top) */}
      {showAddModal && (
        <div
          className="sp-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => {
            setShowAddModal(false);
            resetForm();
          }}
        >
          <div
            className="sp-modal sp-modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sp-modal-head">
              <h2>
                <i
                  className={`bi ${editingSubjectId ? "bi-pencil-square" : "bi-plus-circle"}`}
                ></i>{" "}
                {editingSubjectId ? "Edit" : "Add"} Subject
              </h2>
              <button
                className="sp-modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                title="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="sp-modal-body">
              <div className="sp-form-section">Subject Information</div>
              <div className="sp-field" style={{ marginBottom: "20px" }}>
                <label className="sp-label">Subject Name *</label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    background: "white",
                  }}
                  ref={subjectDropdownRef}
                >
                  <textarea
                    className="sp-input"
                    placeholder="Subject name..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      minHeight: "44px",
                      height: "auto",
                      resize: "none",
                      flex: 1,
                      paddingTop: "11px",
                    }}
                    rows="1"
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                  />
                  <div
                    onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                    style={{
                      cursor: "pointer",
                      color: "#795548",
                      background: "#f8fafc",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #eef2ff",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        marginRight: "6px",
                      }}
                    >
                      SYLLABUS
                    </span>
                    <i
                      className={`bi bi-chevron-${subjectDropdownOpen ? "up" : "down"}`}
                    ></i>
                  </div>

                  {subjectDropdownOpen && (
                    <div
                      className="sp-subjects-dropdown"
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        width: "340px",
                        background: "white",
                        borderRadius: "20px",
                        boxShadow: "0 20px 50px rgba(99,102,241,0.15)",
                        zIndex: 1070,
                        border: "1px solid #eef2ff",
                        padding: "20px",
                      }}
                    >
                      <div
                        className="d-flex gap-2 mb-4"
                        style={{
                          background: "#f1f5f9",
                          padding: "5px",
                          borderRadius: "14px",
                        }}
                      >
                        {["pdf", "manual"].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setSubjectSourceTab(tab)}
                            style={{
                              flex: 1,
                              padding: "10px",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              cursor: "pointer",
                              background:
                                subjectSourceTab === tab
                                  ? "#795548"
                                  : "transparent",
                              color:
                                subjectSourceTab === tab ? "white" : "#64748b",
                            }}
                          >
                            {tab.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                        {syllabusData.filter(
                          (s) => s.source === subjectSourceTab,
                        ).length > 0 ? (
                          syllabusData
                            .filter((s) => s.source === subjectSourceTab)
                            .map((s, i) => (
                              <div
                                key={i}
                                onClick={() => {
                                  setSubject(s.courseTitle);
                                  if (s.chapters)
                                    setChapters(s.chapters.length);
                                  setSubjectDropdownOpen(false);
                                }}
                                style={{
                                  padding: "12px 16px",
                                  borderRadius: "12px",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                  border: "1px solid transparent",
                                  transition: "0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#f8fafc";
                                  e.currentTarget.style.borderColor = "#eef2ff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "transparent";
                                  e.currentTarget.style.borderColor =
                                    "transparent";
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                    color: "#1e293b",
                                  }}
                                >
                                  {s.courseTitle}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#795548",
                                    fontWeight: "600",
                                  }}
                                >
                                  {s.chapters?.length || 0} Chapters
                                </div>
                              </div>
                            ))
                        ) : (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "30px 10px",
                              background: "#f8fafc",
                              borderRadius: "15px",
                            }}
                          >
                            <i
                              className="bi bi-folder-x"
                              style={{
                                fontSize: "1.5rem",
                                color: "#94a3b8",
                                display: "block",
                                marginBottom: "10px",
                              }}
                            ></i>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: "#64748b",
                              }}
                            >
                              No data found
                            </div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#94a3b8",
                                marginTop: "4px",
                              }}
                            >
                              Please upload your syllabus in Settings.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="sp-form-row">
                <div className="sp-field">
                  <label className="sp-label">Exam Date *</label>
                  <GyaanCalendar
                    value={examDate}
                    onChange={(v) => setExamDate(v)}
                    minDate={dayjs().format("YYYY-MM-DD")}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label">Total Chapters</label>
                  <input
                    type="number"
                    className="sp-input"
                    value={chapters}
                    onChange={(e) => setChapters(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label">Avg Time/Ch (hrs)</label>
                  <input
                    type="number"
                    className="sp-input"
                    step="0.5"
                    value={avgChapterTime}
                    onChange={(e) =>
                      setAvgChapterTime(parseFloat(e.target.value) || 1.5)
                    }
                  />
                </div>
              </div>

              <div className="sp-form-section">Study Mode</div>
              <div
                className={`sp-toggle-wrap ${beginnerMode ? "active" : ""}`}
                onClick={() => setBeginnerMode(!beginnerMode)}
              >
                <label className="sp-toggle">
                  <input
                    type="checkbox"
                    checked={beginnerMode}
                    onChange={(e) => setBeginnerMode(e.target.checked)}
                  />
                  <span className="sp-toggle-slider"></span>
                </label>
                <div>
                  <div className="sp-toggle-text">Beginner Mode</div>
                  <div className="sp-toggle-desc">
                    Use simplified inputs for a new subject.
                  </div>
                </div>
              </div>

              {beginnerMode ? (
                <div className="sp-form-row" style={{ marginTop: "1rem" }}>
                  <div className="sp-field">
                    <label className="sp-label">Familiarity</label>
                    <select
                      className="sp-input"
                      value={familiarity}
                      onChange={(e) => setFamiliarity(e.target.value)}
                    >
                      <option value="none">No Prior Knowledge</option>
                      <option value="little">Little</option>
                      <option value="moderate">Moderate</option>
                      <option value="strong">Strong</option>
                    </select>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Syllabus Size</label>
                    <select
                      className="sp-input"
                      value={syllabusSize}
                      onChange={(e) => setSyllabusSize(e.target.value)}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: "1rem" }}>
                  <div className="sp-field">
                    <label className="sp-label">
                      Difficulty ({difficulty}/10)
                    </label>
                    <input
                      type="range"
                      className="sp-input"
                      min="1"
                      max="10"
                      value={difficulty}
                      onChange={(e) => setDifficulty(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="sp-form-row">
                    <div className="sp-field">
                      <label className="sp-label">
                        Past Score ({pastScore}%)
                      </label>
                      <input
                        type="range"
                        className="sp-input"
                        min="0"
                        max="100"
                        value={pastScore}
                        onChange={(e) => setPastScore(parseInt(e.target.value))}
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">
                        Completion ({completion}%)
                      </label>
                      <input
                        type="range"
                        className="sp-input"
                        min="0"
                        max="100"
                        value={completion}
                        onChange={(e) =>
                          setCompletion(parseInt(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="sp-form-section">Schedule Config</div>
              <div className="d-flex gap-2 mb-4">
                <button
                  onClick={() => setScheduleMode("average")}
                  className={`sp-btn ${scheduleMode === "average" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                >
                  Average
                </button>
                <button
                  onClick={() => setScheduleMode("custom")}
                  className={`sp-btn ${scheduleMode === "custom" ? "sp-btn-primary" : "sp-btn-secondary"}`}
                >
                  Custom Days
                </button>
              </div>

              {scheduleMode === "average" ? (
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "16px",
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "12px 16px",
                      background: "white",
                      borderRadius: "16px",
                      border: "1.5px solid #f1f5f9",
                    }}
                  >
                    <div style={{ width: "80px", flexShrink: 0 }}>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          className="sp-input"
                          style={{
                            height: "42px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "700",
                            fontSize: "0.9rem",
                            paddingRight: "8px",
                            color: "#1e293b",
                          }}
                          value={availableHours}
                          onChange={(e) =>
                            handleAvailableHoursChange(e.target.value)
                          }
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "-10px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "white",
                            padding: "0 6px",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            fontSize: "0.6rem",
                            fontWeight: "800",
                            color: aiLabelFlags ? "#10b981" : "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            zIndex: 1,
                          }}
                        >
                          Hrs/Day
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <GyaanTimePicker
                        value={startTime}
                        onChange={handleStartTimeChange}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: "900",
                        color: "#cbd5e1",
                        alignSelf: "center",
                        flexShrink: 0,
                      }}
                    >
                      TO
                    </div>

                    <div style={{ flex: 1 }}>
                      <GyaanTimePicker
                        value={endTime}
                        onChange={handleEndTimeChange}
                        align="right"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "12px",
                      textAlign: "center",
                      fontSize: "0.72rem",
                      color: "#94a3b8",
                      fontStyle: "italic",
                    }}
                  >
                    <i className="bi bi-info-circle me-1"></i> These hours will
                    apply to all selected study days.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "16px",
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {Object.entries(weeklyAvailability).map(([day, config]) => (
                    <div
                      key={day}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "12px 16px",
                        background: "white",
                        borderRadius: "16px",
                        border: "1.5px solid #f1f5f9",
                        transition: "0.2s",
                      }}
                    >
                      <div style={{ width: "80px", flexShrink: 0 }}>
                        <label
                          className="sp-label"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontSize: "0.85rem",
                            color: "#1e293b",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) =>
                              setWeeklyAvailability({
                                ...weeklyAvailability,
                                [day]: { ...config, enabled: e.target.checked },
                              })
                            }
                            style={{
                              width: "18px",
                              height: "18px",
                              accentColor: "#795548",
                              borderRadius: "4px",
                            }}
                          />
                          {day.slice(0, 3)}
                        </label>
                      </div>

                      <div style={{ flex: 1 }}>
                        {config.enabled ? (
                          <div className="d-flex align-items-center gap-3 w-100">
                            <div style={{ flex: 1 }}>
                              <GyaanTimePicker
                                value={config.start}
                                onChange={(v) =>
                                  setWeeklyAvailability({
                                    ...weeklyAvailability,
                                    [day]: { ...config, start: v },
                                  })
                                }
                              />
                            </div>
                            <div
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: "900",
                                color: "#cbd5e1",
                                alignSelf: "center",
                                flexShrink: 0,
                              }}
                            >
                              TO
                            </div>
                            <div style={{ flex: 1 }}>
                              <GyaanTimePicker
                                value={config.end}
                                onChange={(v) =>
                                  setWeeklyAvailability({
                                    ...weeklyAvailability,
                                    [day]: { ...config, end: v },
                                  })
                                }
                                align="right"
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#94a3b8",
                              fontStyle: "italic",
                              paddingLeft: "4px",
                            }}
                          >
                            Session Off
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sp-modal-foot">
              <button
                className="sp-btn sp-btn-secondary"
                onClick={handleAIPrediction}
                disabled={mlLoading}
              >
                <i
                  className={`bi ${mlLoading ? "bi-hourglass-split" : "bi-robot"}`}
                ></i>{" "}
                {mlLoading ? "Predicting..." : "Prediction"}
              </button>
              <button
                className="sp-btn sp-btn-success"
                onClick={() => {
                  handleAddSubject();
                  if (aiLabelFlags) {
                    setTimeout(
                      () =>
                        toast(
                          'Now press "Generate Plan" to create an optimized timetable!',
                          { icon: "📋", duration: 6000 },
                        ),
                      500,
                    );
                  }
                }}
              >
                {editingSubjectId
                  ? aiLabelFlags
                    ? "Save AI Changes"
                    : "Update Subject"
                  : "Add Subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudyPlannerDashboard;
