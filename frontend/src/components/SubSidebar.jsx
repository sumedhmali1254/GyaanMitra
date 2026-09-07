import React, { useMemo, useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { usePlanner } from "../context/PlannerContext";
import { useNotifications } from "../context/NotificationContext";
import { useTimer } from "../context/TimerContext";
import "./SubSidebar.css";
import ConfirmationModal from "./ConfirmationModal";
import { toast } from "react-hot-toast";

const SubSidebar = () => {
  const planner = usePlanner();
  const { notifications, removeNotification, clearNotifications } = useNotifications();
  const { seconds, isActive, toggleTimer, mode, formatTime, resetTimer, sessions } = useTimer();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Safely extract planner data
  const subjects = planner?.subjects || [];
  const plannerSessions = planner?.sessions || [];
  const setSessions = planner?.setSessions || (() => { });
  const currentWeekStart = planner?.currentWeekStart || new Date();
  const goToDate = planner?.goToDate || (() => { });
  const selectedDate = planner?.selectedDate || new Date();
  const aiRecommendations = planner?.aiRecommendations || [];
  const setAiRecommendations = planner?.setAiRecommendations || (() => {});
  const setShowAIAdvisorModal = planner?.setShowAIAdvisorModal || (() => {});

  // Stats calculation
  const stats = useMemo(() => {
    return {
      totalSubjects: subjects.length,
      totalSessions: plannerSessions.length,
      completedSessions: plannerSessions.filter(s => s.completed).length,
      totalHours: plannerSessions.reduce((sum, s) => sum + (s.duration || 1), 0),
    };
  }, [subjects, plannerSessions]);

  // Exam matching logic for calendar
  const examDates = useMemo(() => {
    return subjects.map(s => ({ date: s.examDate, subject: s.subject }));
  }, [subjects]);

  // Mini Calendar logic
  const calendarDays = useMemo(() => {
    const startOfMonth = dayjs(currentWeekStart).startOf("month");
    const firstDayOfMonth = startOfMonth.day(); // 0 is Sunday
    const adjustedStart = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust to Monday start

    const totalGridDays = 42; // standard 6x7 grid
    const days = [];
    
    // Start from the local Monday, which may be in the previous month
    const gridStartDate = startOfMonth.subtract(adjustedStart, "day");

    for (let i = 0; i < totalGridDays; i++) {
      const currentDay = gridStartDate.add(i, "day");
      const dateStr = currentDay.format("YYYY-MM-DD");
      const exam = examDates.find(e => e.date === dateStr);
      
      days.push({
        num: currentDay.date(),
        date: dateStr,
        isToday: dateStr === dayjs().format("YYYY-MM-DD"),
        hasExam: !!exam,
        examSubject: exam?.subject,
        isOutside: currentDay.month() !== startOfMonth.month()
      });
    }
    return days;
  }, [currentWeekStart, examDates]);

  // Upcoming exams list (next 3)
  const upcomingExams = useMemo(() => {
    return [...examDates]
      .filter(e => dayjs(e.date).isAfter(dayjs().subtract(1, "day")))
      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
      .slice(0, 6);
  }, [examDates]);

  // Month/Year navigation state
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const dropdownWrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (ev) => {
      if (dropdownWrapperRef.current && !dropdownWrapperRef.current.contains(ev.target)) {
        setShowMonthMenu(false);
        setShowYearMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateMonth = (offset) => {
    const newDate = dayjs(currentWeekStart).add(offset, "month").toDate();
    goToDate(newDate);
    setShowMonthMenu(false);
    setShowYearMenu(false);
  };

  return (
    <aside className="sub-sidebar">
      <div className="sub-sidebar-header">
        <h3 className="sub-sidebar-title">
          <i className="bi bi-diagram-3"></i> Planner Subsidebar
        </h3>
      </div>

      <div className="sub-sidebar-content">
        {/* MINI CALENDAR */}
        <div className="sub-sidebar-calendar" style={{ padding: "20px" }}>
          <div className="mini-calendar-header" style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
            <div className="mini-calendar-title-wrap" ref={dropdownWrapperRef} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "6px 14px", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                <div style={{ position: "relative" }}>
                  <div 
                    onClick={() => { setShowMonthMenu(!showMonthMenu); setShowYearMenu(false); }} 
                    style={{ fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", color: "#1e293b" }}
                  >
                    {dayjs(currentWeekStart).format("MMMM")}
                  </div>
                  {showMonthMenu && (
                    <div className="custom-dropdown-menu">
                      {months.map(m => (
                        <div key={m} className="dropdown-item" onClick={() => { goToDate(dayjs(currentWeekStart).month(months.indexOf(m)).toDate()); setShowMonthMenu(false); }}>
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ color: "#cbd5e1" }}>-</span>
                <div style={{ position: "relative" }}>
                  <div 
                    onClick={() => { setShowYearMenu(!showYearMenu); setShowMonthMenu(false); }} 
                    style={{ fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", color: "#1e293b" }}
                  >
                    {dayjs(currentWeekStart).year()}
                  </div>
                  {showYearMenu && (
                    <div className="custom-dropdown-menu">
                      {years.map(y => (
                        <div key={y} className="dropdown-item" onClick={() => { goToDate(dayjs(currentWeekStart).year(y).toDate()); setShowYearMenu(false); }}>
                          {y}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => navigateMonth(-1)} className="mini-cal-btn"><i className="bi bi-chevron-left"></i></button>
                <button onClick={() => navigateMonth(1)} className="mini-cal-btn"><i className="bi bi-chevron-right"></i></button>
              </div>
            </div>
          </div>

          <div className="mini-calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="mini-calendar-weekday">{d}</div>
            ))}
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} className="mini-calendar-day inactive" />;
              
              const isSelected = dayjs(day.date).isSame(dayjs(selectedDate), "day");
              
              // Calculate if the day belongs to the current visible week highlighted in yellow
              const diff = dayjs(day.date).startOf("day").diff(dayjs(currentWeekStart).startOf("day"), "day");
              const isInWeek = diff >= 0 && diff <= 6;

              return (
                <div 
                  key={idx} 
                  className={`mini-calendar-day ${day.hasExam ? "with-exam" : ""} ${day.isToday ? "today" : ""} ${isSelected ? "selected-day" : ""} ${isInWeek ? "in-week" : ""} ${day.isOutside ? "out-month" : ""}`}
                  onClick={() => goToDate(dayjs(day.date).toDate())}
                  title={day.hasExam ? `Exam: ${day.examSubject}` : ""}
                >
                  {day.num}
                </div>
              );
            })}
          </div>

          <div style={{ height: "1px", background: "#e2e8f0", margin: "25px 0" }}></div>

          {/* UPCOMING EXAMS IN SIDEBAR */}
          <div className="sidebar-exam-list" style={{ marginTop: "0" }}>
            <div className="sidebar-exam-title">Upcoming Exams</div>
            {upcomingExams.length > 0 ? (
              upcomingExams.map((exam, i) => (
                <div key={i} className="sidebar-exam-item">
                  <div className="exam-item-dot"></div>
                  <div className="exam-item-info">
                    <div className="exam-item-name">{exam.subject}</div>
                    <div className="exam-item-date">
                      {dayjs(exam.date).format("MMM DD")} <span style={{ color: '#94a3b8', fontSize: '0.62rem', fontWeight: 600 }}>• {dayjs(exam.date).format("ddd")}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "10px", fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                No upcoming exams
              </div>
            )}
          </div>

          <div style={{ height: "1px", background: "#e2e8f0", margin: "25px 0" }}></div>

          {/* AI ADVISOR ALERTS LOG */}
          <div className="sidebar-exam-list" style={{ marginTop: "0" }}>
            <div className="sidebar-exam-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>AI Advisor Alerts</span>
              {aiRecommendations.length > 0 && (
                <button
                  onClick={() => {
                    if (aiRecommendations.length > 0) {
                      setShowAIAdvisorModal(true);
                    } else {
                      toast.success("Optimized! Your study plan is fully ready.", { icon: "🤖" });
                    }
                  }}
                  style={{ border: 'none', background: 'none', color: '#795548', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  VIEW ALL
                </button>
              )}

            </div>
            {aiRecommendations.length > 0 ? (
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aiRecommendations.map((rec, idx) => {
                  const isWarning = rec.shortageHours > 0;
                  return (
                    <div key={idx} className="sidebar-exam-item animate-fade-in" style={{ 
                      borderLeft: `3px solid ${isWarning ? '#ef4444' : '#10b981'}`, 
                      background: isWarning ? 'rgba(239, 68, 68, 0.03)' : 'rgba(16, 185, 129, 0.03)',
                      position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px',
                      borderRadius: '0 12px 12px 0'
                    }}>
                      <div className="exam-item-info w-100">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#1e293b' }}>
                            {rec.subjectName}
                          </div>
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px',
                            borderRadius: '4px', textTransform: 'uppercase',
                            background: rec.priority === 'high' ? '#fee2e2' : rec.priority === 'normal' ? '#fef3c7' : '#dcfce7',
                            color: rec.priority === 'high' ? '#ef4444' : rec.priority === 'normal' ? '#d97706' : '#10b981'
                          }}>
                            {rec.priority}
                          </span>
                        </div>
                        <div className="exam-item-name" style={{ fontSize: '0.7rem', lineHeight: '1.4', whiteSpace: 'normal', color: '#64748b', fontWeight: '500', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {isWarning 
                            ? `Action required! Increase to ${rec.recommendedDailyHours}h/day. Shortage: ${rec.shortageHours}h.` 
                            : `Plan is achievable with ${rec.recommendedDailyHours}h/day.`}
                        </div>
                        {isWarning && (
                          <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="bi bi-magic"></i> Click VIEW ALL to implement
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "10px", fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                AI is monitoring your progress...
              </div>
            )}
          </div>
        </div>

        <div style={{ height: "1px", background: "#e2e8f0", margin: "10px 25px" }}></div>

        {/* STATS SECTION */}
        <div className="sub-sidebar-stats" style={{ padding: '10px 20px 20px' }}>
          <div className="stats-cards-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px',
            marginBottom: '15px'
          }}>
            <div className="stat-card">
              <div className="d-flex align-items-center">
                <i className="bi bi-book fs-4 text-primary me-3"></i>
                <div>
                  <div className="fw-bold fs-4">{stats.totalSubjects}</div>
                  <small className="text-secondary small">Subjects</small>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="d-flex align-items-center">
                <i className="bi bi-calendar-check fs-4 text-success me-3"></i>
                <div>
                  <div className="fw-bold fs-4">{stats.totalSessions}</div>
                  <small className="text-secondary small">Sessions</small>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="d-flex align-items-center">
                <i className="bi bi-check2-circle fs-4 text-warning me-3"></i>
                <div>
                  <div className="fw-bold fs-4">{stats.completedSessions}</div>
                  <small className="text-secondary small">Completed</small>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="d-flex align-items-center">
                <i className="bi bi-clock-history fs-4 text-info me-3"></i>
                <div>
                  <div className="fw-bold fs-4">{stats.totalHours}h</div>
                  <small className="text-secondary small">Hours</small>
                </div>
              </div>
            </div>
          </div>
          
          {plannerSessions.length > 0 && (
            <button 
              className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={() => setShowDeleteModal(true)}
              style={{ fontSize: "0.85rem", padding: "10px", borderRadius: "10px", marginTop: "5px" }}
            >
              <i className="bi bi-trash3"></i> Clear Generated Plan
            </button>
          )}
        </div>

        <div className="sub-sidebar-footer">
          <div className="sub-sidebar-help">
            <i className="bi bi-question-circle"></i>
            <div>
              <p className="help-title">Need Help?</p>
              <small className="help-text">Check out the study planner guide</small>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal 
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          if (planner?.clearSessions) {
            planner.clearSessions();
          } else {
            setSessions([]);
          }
          setAiRecommendations([]);
          setShowAIAdvisorModal(false);
          setShowDeleteModal(false);
          toast.success("Plan and AI alerts cleared from Database!");
        }}
        title="Delete Generated Plan?"
        message="Are you sure you want to clear the current timetable? This action cannot be undone."
        type="danger"
      />

      <style>{`
        .custom-dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          left: -10px;
          min-width: 130px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 100;
          padding: 8px;
          border: 1px solid #f1f5f9;
          max-height: 250px;
          overflow-y: auto;
          scrollbar-width: thin;
        }
        .dropdown-item {
          padding: 8px 12px;
          font-size: 0.8rem;
          color: #475569;
          border-radius: 8px;
          cursor: pointer;
          transition: 0.2s;
        }
        .dropdown-item:hover {
          background: #f1f5fa;
          color: #795548;
        }
      `}</style>
    </aside>
  );
};

export default SubSidebar;
