import React, { useMemo } from "react";
import dayjs from "dayjs";

const PlannerSidebar = ({
  stats,
  priority,
  recommendedHours,
  subjectsCount,
  sessionsCount,
  onGeneratePlan,
  planLoading,
  onClearPlan,
  examDates = [],
  currentWeekStart,
  onWeekChange,
  collapsed,
  onToggle,
}) => {
  if (collapsed) {
    return (
      <div
        className="planner-sidebar-collapsed"
        onClick={onToggle}
        style={{ 
          cursor: "pointer", 
          width: '60px', 
          background: 'white', 
          borderRight: '1px solid #eef2ff',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '20px'
        }}
        title="Expand sidebar"
      >
        <i className="bi bi-chevron-right" style={{ color: '#795548' }}></i>
      </div>
    );
  }

  const monthYear = useMemo(() => {
    return dayjs(currentWeekStart).format("MMMM YYYY");
  }, [currentWeekStart]);

  const calendarDays = useMemo(() => {
    const startOfMonth = dayjs(currentWeekStart).startOf('month');
    const daysInMonth = startOfMonth.daysInMonth();
    const startDay = startOfMonth.day(); // 0 is Sunday
    
    // Adjust for Monday start: Mon=0, Tue=1 ... Sun=6
    const adjustedStart = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    for (let i = 0; i < adjustedStart; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = startOfMonth.date(i).format("YYYY-MM-DD");
      const exam = examDates.find(e => e.date === dateStr);
      days.push({
        num: i,
        date: dateStr,
        isToday: dateStr === dayjs().format("YYYY-MM-DD"),
        hasExam: !!exam,
        examSubject: exam?.subject
      });
    }
    return days;
  }, [currentWeekStart, examDates]);

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  const navigateMonth = (dir) => {
    onWeekChange(dayjs(currentWeekStart).add(dir, 'month').toDate());
  };

  // Sorted upcoming exams for the list below
  const upcomingExams = useMemo(() => {
    return [...examDates]
      .filter(e => dayjs(e.date).isAfter(dayjs().subtract(1, 'day')))
      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
      .slice(0, 6);
  }, [examDates]);

  return (
    <div className="planner-sidebar-expanded" style={{
      width: '320px',
      background: 'white',
      borderRight: '1.5px solid #f1f5f9',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      <div style={{ padding: '24px', position: 'relative' }}>
        <button onClick={onToggle} style={{
          position: 'absolute', right: '12px', top: '24px',
          background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'
        }}>
          <i className="bi bi-chevron-left"></i>
        </button>
        
        <div className="mini-calendar-container">
          <div className="mini-calendar-header">
            <h4 className="mini-calendar-title">{monthYear}</h4>
            <div className="mini-calendar-nav">
              <button className="mini-cal-btn" onClick={() => navigateMonth(-1)}><i className="bi bi-chevron-left"></i></button>
              <button className="mini-cal-btn" onClick={() => navigateMonth(1)}><i className="bi bi-chevron-right"></i></button>
            </div>
          </div>

          <div className="mini-calendar-grid">
            {weekdays.map((d, i) => <div key={i} className="mini-calendar-weekday">{d}</div>)}
            {calendarDays.map((day, idx) => (
              <div 
                key={idx} 
                className={`mini-calendar-day ${!day ? 'inactive' : ''} ${day?.hasExam ? 'with-exam' : ''} ${day?.isToday ? 'today' : ''}`}
                title={day?.examSubject ? `Exam: ${day.examSubject}` : ''}
              >
                {day?.num}
              </div>
            ))}
          </div>
        </div>

        {/* UPCOMING EXAMS LIST */}
        <div className="sidebar-exam-list">
          <div className="sidebar-exam-title">Important Exam Days</div>
          {upcomingExams.length > 0 ? (
            upcomingExams.map((exam, i) => (
              <div key={i} className="sidebar-exam-item">
                <div className="exam-item-dot"></div>
                <div className="exam-item-info">
                  <div className="exam-item-name">{exam.subject}</div>
                  <div className="exam-item-date">{dayjs(exam.date).format("MMM DD, YYYY")}</div>
                </div>
                <div className="exam-item-day">{dayjs(exam.date).format("ddd")}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', fontSize: '0.75rem', color: '#94a3b8' }}>
              No upcoming exams scheduled
            </div>
          )}
        </div>

        {/* STATS SECTION */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Weekly Brief</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #eef2ff' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>Subjects</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{subjectsCount}</div>
            </div>
            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #eef2ff' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>Planned</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#795548' }}>{stats?.totalHours || 0}h</div>
            </div>
          </div>
        </div>

        {/* AI INSIGHT */}
        <div style={{ 
          marginTop: '1rem', 
          padding: '16px', 
          background: 'linear-gradient(135deg, #795548 0%, #795548 100%)', 
          borderRadius: '16px',
          color: 'white',
          boxShadow: '0 10px 20px -5px rgba(121, 85, 72, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <i className="bi bi-stars"></i>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>AI Recommendation</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{recommendedHours}h/day</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '4px' }}>Based on your {priority} priority subjects</div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button 
            className="sp-btn sp-btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginBottom: '8px', padding: '12px' }}
            onClick={onGeneratePlan}
            disabled={planLoading || subjectsCount === 0}
          >
            <i className={`bi ${planLoading ? 'bi-hourglass-split' : 'bi-magic'}`}></i>
            {planLoading ? 'Generating...' : 'Generate New Plan'}
          </button>
          <button 
            onClick={onClearPlan}
            style={{ width: '100%', background: 'none', border: '1.5px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
            disabled={subjectsCount === 0}
          >
            Clear Current Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlannerSidebar;
