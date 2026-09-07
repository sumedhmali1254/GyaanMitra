import React, { useState, useMemo, useRef } from "react";
import AddSubjectModal from "./AddSubjectModal"; // Import the modal

// Utility function to format time to 12-hour format with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")} ${period}`;
};

// Utility function to format date
const formatDate = (dateString, format = "full") => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (format === "short") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else if (format === "day") {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const TimetablePanel = ({
  sessions = [],
  generatedPlan,
  stats,
  currentWeekStart,
  onWeekChange,
  subjects,
  onToggleComplete,
  onDeleteSession,
  onDownload,
  onRegenerate,
  // Modal props
  beginnerMode,
  onBeginnerModeChange,
  subject,
  examDate,
  chapters,
  familiarity,
  syllabusSize,
  difficulty,
  pastScore,
  completion,
  priority,
  recommendedHours,
  daysLeft,
  confidence,
  mlLoading,
  mlError,
  onSubjectChange,
  onExamDateChange,
  onChaptersChange,
  onFamiliarityChange,
  onSyllabusSizeChange,
  onDifficultyChange,
  onPastScoreChange,
  onCompletionChange,
  onAIPrediction,
  onAddSubject,
}) => {
  const [currentView, setCurrentView] = useState("week");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const timetableRef = useRef(null);

  // Calculate week end date
  const getWeekEnd = (startDate) => {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    return end;
  };

  // Get exam dates from subjects
  const examDates = useMemo(() => {
    return (subjects || [])
      .filter((s) => s.examDate)
      .map((s) => ({
        date: s.examDate,
        subject: s.subject,
      }));
  }, [subjects]);

  // Get sessions for current week (or empty array if none)
  const weekSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = getWeekEnd(weekStart);
    weekEnd.setHours(23, 59, 59, 999);

    return sessions.filter((s) => {
      if (!s || !s.date) return false;
      const sessionDate = new Date(s.date);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
  }, [sessions, currentWeekStart]);

  // Navigate weeks
  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + direction * 7);
    onWeekChange(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    onWeekChange(monday);
  };

  // Get days of current week with dates
  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      days.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        fullName: date.toLocaleDateString("en-US", { weekday: "long" }),
        date: date.toISOString().split("T")[0],
        dateObj: date,
        dayNum: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        isToday:
          new Date().toISOString().split("T")[0] ===
          date.toISOString().split("T")[0],
      });
    }
    return days;
  }, [currentWeekStart]);

  // Time slots (8 AM to 10 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      slots.push({
        hour,
        label: formatTime12Hour(`${hour.toString().padStart(2, "0")}:00`),
      });
    }
    return slots;
  }, []);

  // Check if a date has exam
  const getExamForDate = (date) => {
    return examDates.find((e) => e.date === date);
  };

  // Check if there are any sessions
  const hasSessions = sessions && sessions.length > 0;

  // Handle add subject button click
  const handleAddSubjectClick = () => {
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  // Handle add subject from modal
  const handleAddSubject = () => {
    onAddSubject();
    setIsModalOpen(false);
  };

  return (
    <div className="timetable-panel" ref={timetableRef}>
      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        beginnerMode={beginnerMode}
        onBeginnerModeChange={onBeginnerModeChange}
        subject={subject}
        examDate={examDate}
        chapters={chapters}
        familiarity={familiarity}
        syllabusSize={syllabusSize}
        difficulty={difficulty}
        pastScore={pastScore}
        completion={completion}
        priority={priority}
        recommendedHours={recommendedHours}
        daysLeft={daysLeft}
        confidence={confidence}
        mlLoading={mlLoading}
        mlError={mlError}
        onSubjectChange={onSubjectChange}
        onExamDateChange={onExamDateChange}
        onChaptersChange={onChaptersChange}
        onFamiliarityChange={onFamiliarityChange}
        onSyllabusSizeChange={onSyllabusSizeChange}
        onDifficultyChange={onDifficultyChange}
        onPastScoreChange={onPastScoreChange}
        onCompletionChange={onCompletionChange}
        onAIPrediction={onAIPrediction}
        onAddSubject={handleAddSubject}
      />

      {/* Add Subject Button */}
      <div className="add-subject-section">
        <button className="btn-add-subject" onClick={handleAddSubjectClick}>
          <i className="bi bi-plus-lg"></i>
          Add New Subject
        </button>
      </div>

      {/* Panel Header with Week Navigation and Actions */}
      <div className="panel-header">
        <div className="header-left">
          <h3>
            <i className="bi bi-calendar-event"></i>
            Study Calendar
          </h3>
          <div className="week-nav">
            <button
              className="nav-btn"
              onClick={() => navigateWeek(-1)}
              title="Previous week"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <div className="week-range">
              <span className="week-range-text">
                {weekDays[0]?.month} {weekDays[0]?.dayNum} -{" "}
                {weekDays[6]?.month} {weekDays[6]?.dayNum},{" "}
                {currentWeekStart.getFullYear()}
              </span>
            </div>
            <button
              className="nav-btn"
              onClick={() => navigateWeek(1)}
              title="Next week"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
            <button
              className="nav-btn today-btn"
              onClick={goToToday}
              title="Go to today"
            >
              Today
            </button>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`view-btn ${currentView === "week" ? "active" : ""}`}
            onClick={() => setCurrentView("week")}
          >
            Week
          </button>
          <button
            className={`view-btn ${currentView === "list" ? "active" : ""}`}
            onClick={() => setCurrentView("list")}
          >
            List
          </button>
          <button
            className={`view-btn ${currentView === "month" ? "active" : ""}`}
            onClick={() => setCurrentView("month")}
          >
            Month
          </button>
          <div className="separator"></div>
          <button
            className="action-btn"
            title="Regenerate Plan"
            onClick={onRegenerate}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          {hasSessions && (
            <>
              <button
                className="action-btn"
                title="Download CSV"
                onClick={onDownload}
              >
                <i className="bi bi-download"></i>
              </button>
              <button
                className="action-btn"
                title="Print Timetable"
                onClick={() => window.print()}
              >
                <i className="bi bi-printer"></i>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Week Days Header */}
      <div className="week-days-header">
        <div className="time-col-header">Time</div>
        {weekDays.map((day) => {
          const exam = getExamForDate(day.date);
          return (
            <div
              key={day.date}
              className={`day-header-cell ${exam ? "exam-day" : ""} ${day.isToday ? "today" : ""}`}
            >
              <div className="day-name">{day.name}</div>
              <div className="day-date">{day.dayNum}</div>
              {exam && (
                <div className="exam-badge" title={`${exam.subject} Exam`}>
                  {exam.subject}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timetable Grid */}
      <div className="timetable-grid">
        {timeSlots.map((slot) => (
          <div key={slot.hour} className="grid-row">
            <div className="time-col">{slot.label}</div>
            {weekDays.map((day) => {
              const sessionsForSlot = weekSessions.filter(
                (s) =>
                  s.date === day.date &&
                  parseInt(s.startTime?.split(":")[0]) === slot.hour,
              );
              const exam = getExamForDate(day.date);

              return (
                <div
                  key={`${day.date}-${slot.hour}`}
                  className={`grid-cell ${exam ? "exam-cell" : ""}`}
                >
                  {sessionsForSlot.length > 0 ? (
                    sessionsForSlot.map((session) => (
                      <div
                        key={session.id}
                        className={`session-item priority-${session.priority} ${
                          session.completed ? "completed" : ""
                        }`}
                        onClick={() =>
                          onToggleComplete && onToggleComplete(session.id)
                        }
                      >
                        <div className="session-subject">{session.subject}</div>
                        <div className="session-chapter">
                          Ch {session.chapter}
                        </div>
                        <div className="session-time">
                          {formatTime12Hour(session.startTime)}-
                          {formatTime12Hour(session.endTime)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-cell"></div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Empty State Message (only shown when no sessions) */}
      {!hasSessions && (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="bi bi-calendar-x"></i>
          </div>
          <h4>No Timetable Yet</h4>
          <p>
            Add subjects to your plan and click "Generate Plan" to create your
            personalized weekly timetable.
          </p>
          <button className="btn-generate" onClick={onRegenerate}>
            <i className="bi bi-magic"></i>
            Generate Timetable
          </button>
        </div>
      )}
    </div>
  );
};

export default TimetablePanel;
