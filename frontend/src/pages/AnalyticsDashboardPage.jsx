import React, { useState, useEffect, useContext, useMemo } from "react";
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2";
import "chart.js/auto";
import { AuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTimer } from "../context/TimerContext";
import api from "../services/api";

const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const dateForRange = (range, now) => {
  const start = startOfDay(now);
  if (range === "week") start.setDate(start.getDate() - 6);
  if (range === "month") start.setDate(start.getDate() - 29);
  if (range === "year") start.setMonth(0, 1);
  return start;
};

const AnalyticsDashboardPage = () => {
  const { user, token } = useContext(AuthContext);
  const { syllabusData } = useSettings();
  const { liveSession } = useTimer();
  const [sessions, setSessions] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");

  useEffect(() => {
    let isActive = true;
    let isFetching = false;

    const fetchAnalyticsData = async () => {
      if (isFetching || document.hidden) return;
      isFetching = true;
      try {
        const [statsRes, quizRes] = await Promise.all([
          api.get("/sessions/stats"),
          api.get("/quiz/stats")
        ]);
        
        if (isActive && statsRes.data.success) {
          setSessions(statsRes.data.data);
        }
        if (isActive && quizRes.data.success) {
          setQuizResults(quizRes.data.data);
        }
      } catch (error) {
        console.error("Error fetching analytics stats:", error);
      } finally {
        isFetching = false;
        if (isActive) setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (!document.hidden) fetchAnalyticsData();
    };

    if (token) {
      fetchAnalyticsData();
      const intervalId = window.setInterval(refreshWhenVisible, 30000);
      document.addEventListener("visibilitychange", refreshWhenVisible);
      window.addEventListener("focus", refreshWhenVisible);
      window.addEventListener("study-session-updated", refreshWhenVisible);
      return () => {
        isActive = false;
        window.clearInterval(intervalId);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
        window.removeEventListener("focus", refreshWhenVisible);
        window.removeEventListener("study-session-updated", refreshWhenVisible);
      };
    }

    setSessions([]);
    setQuizResults([]);
    setLoading(false);
    return () => {
      isActive = false;
    };
  }, [token]);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const rangeStart = dateForRange(timeRange, now);
    const sessionsIncludingActive = liveSession
      ? [...sessions, liveSession]
      : sessions;
    return sessionsIncludingActive.filter((session) => {
      const startTime = new Date(session.startTime);
      return !Number.isNaN(startTime.getTime()) &&
        startTime >= rangeStart &&
        startTime <= now;
    });
  }, [sessions, liveSession, timeRange]);

  const filteredQuizzes = useMemo(() => {
    const now = new Date();
    const rangeStart = dateForRange(timeRange, now);
    return quizResults.filter((quiz) => {
      const completedAt = new Date(quiz.completedAt || quiz.createdAt);
      return !Number.isNaN(completedAt.getTime()) &&
        completedAt >= rangeStart &&
        completedAt <= now;
    });
  }, [quizResults, timeRange]);

  // Aggregate Study Hours for StudyData Chart
  const studyData = useMemo(() => {
    let labels = [];
    let data = [];
    
    if (timeRange === "day") {
      labels = ["Today"];
      const total = filteredSessions.reduce((acc, session) => acc + ((Number(session.duration) || 0) / 60), 0);
      data = [total];
    } else if (timeRange === "week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const counts = new Array(7).fill(0);
      const rangeStart = dateForRange("week", new Date());
      for (let i = 0; i < 7; i++) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        labels.push(days[(d.getDay() + 6) % 7]);
      }
      filteredSessions.forEach((session) => {
        const sessionDate = startOfDay(new Date(session.startTime));
        const dayIndex = Math.round((sessionDate - rangeStart) / 86400000);
        if (dayIndex >= 0 && dayIndex < 7) counts[dayIndex] += (Number(session.duration) || 0) / 60;
      });
      data = counts;
    } else if (timeRange === "month") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
      const counts = new Array(5).fill(0);
      const rangeStart = dateForRange("month", new Date());
      filteredSessions.forEach((session) => {
        const sessionDate = startOfDay(new Date(session.startTime));
        const weekIndex = Math.floor((sessionDate - rangeStart) / (7 * 86400000));
        if (weekIndex >= 0 && weekIndex < 5) counts[weekIndex] += (Number(session.duration) || 0) / 60;
      });
      data = counts;
    } else {
      labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const counts = new Array(12).fill(0);
      filteredSessions.forEach((session) => {
        const date = new Date(session.startTime);
        if (new Date().getFullYear() === date.getFullYear()) {
          counts[date.getMonth()] += (Number(session.duration) || 0) / 60;
        }
      });
      data = counts;
    }

    return {
      labels,
      datasets: [
        {
          label: "Study Hours",
          data: data.map(v => parseFloat(v.toFixed(1))),
          backgroundColor: "rgba(121, 85, 72, 0.5)",
          borderColor: "rgba(121, 85, 72, 1)",
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };
  }, [filteredSessions, timeRange]);

  // Subject Breakdown data from syllabus
  const subjectBreakdown = useMemo(() => {
    const validSyllabus = syllabusData.filter(s => s.courseTitle);
    const subjects = validSyllabus.map(s => s.courseTitle);
    const chaptersCounts = validSyllabus.map(s => s.chapters?.length || 0);

    const hasData = subjects.length > 0;

    return {
      labels: hasData ? subjects : ["No Subjects Added"],
      datasets: [
        {
          data: hasData ? chaptersCounts : [1],
          backgroundColor: hasData ? [
            "rgba(121, 85, 72, 0.8)",
            "rgba(6, 182, 212, 0.8)",
            "rgba(244, 114, 182, 0.8)",
            "rgba(245, 158, 11, 0.8)",
            "rgba(100, 116, 139, 0.8)",
          ] : ["rgba(0, 0, 0, 0.1)"],
          borderWidth: 0,
        },
      ],
    };
  }, [syllabusData]);

  // Subject Progress
  const progressData = useMemo(() => {
    const subjects = syllabusData.map((course) => course.courseTitle || "Course");
    const data = syllabusData.map((course) => {
      const courseQuizzes = filteredQuizzes.filter(
        (result) => result.courseTitle === course.courseTitle,
      );
      return courseQuizzes.length
        ? courseQuizzes.reduce((sum, result) => sum + (Number(result.accuracy) || 0), 0) / courseQuizzes.length
        : 0;
    });
    
    return {
      labels: subjects.length > 0 ? subjects : ["No Subjects"],
      datasets: [
        {
          label: "Average Quiz Accuracy %",
          data: subjects.length > 0 ? data : [0],
          backgroundColor: "rgba(121, 85, 72, 0.7)",
          borderRadius: 8,
        },
      ],
    };
  }, [syllabusData, filteredQuizzes]);

  const stats = useMemo(() => {
    const totalMin = filteredSessions.reduce((sum, session) => sum + (Number(session.duration) || 0), 0);
    const loginStreak = Math.max(0, Number(user?.loginStreak ?? user?.settings?.loginStreak) || 0);
    
    return [
      {
        label: "Total Study Time",
        value: totalMin < 60 ? `${totalMin.toFixed(1)}m` : `${(totalMin / 60).toFixed(1)}h`,
        change: `Last ${timeRange}`,
        icon: "bi-clock-history",
        color: "primary",
      },
      {
        label: "Focus Sessions",
        value: filteredSessions.length.toString(),
        change: liveSession ? "Focus session in progress" : "Recorded sessions",
        icon: "bi-lightning-charge",
        color: "success",
      },
      {
        label: "Courses Managed",
        value: syllabusData.length.toString(),
        change: "Synced",
        icon: "bi-book-half",
        color: "warning",
      },
      {
        label: "Login Streak",
        value: `${loginStreak} days`,
        change: "Consecutive days",
        icon: "bi-fire",
        color: "info",
      },
    ];
  }, [filteredSessions, liveSession, syllabusData, timeRange, user?.loginStreak, user?.settings?.loginStreak]);

  // Fetch real quiz stats for the chart
  const quizData = useMemo(() => {
    const hasResults = filteredQuizzes.length > 0;
    const sorted = [...filteredQuizzes].sort(
      (a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt),
    );
    const labels = hasResults ? sorted.map((r, i) => `Quiz ${i+1}`) : ["No quizzes"];
    const data = hasResults ? sorted.map((r) => Number(r.accuracy) || 0) : [0];

    return {
      labels,
      datasets: [
        {
          label: "Quiz Score %",
          data,
          fill: true,
          backgroundColor: hasResults ? "rgba(6, 182, 212, 0.2)" : "rgba(100, 116, 139, 0.05)",
          borderColor: hasResults ? "rgba(6, 182, 212, 1)" : "rgba(100, 116, 139, 0.2)",
          tension: 0.4,
          pointRadius: hasResults ? 4 : 0,
        },
      ],
    };
  }, [filteredQuizzes]);

  const personaMetrics = useMemo(() => {
    const averageAccuracy = filteredQuizzes.length
      ? filteredQuizzes.reduce((sum, quiz) => sum + (Number(quiz.accuracy) || 0), 0) / filteredQuizzes.length
      : 0;
    const activeDays = new Set(
      filteredSessions.map((session) => new Date(session.startTime).toDateString()),
    ).size;
    const now = new Date();
    const rangeDays = timeRange === "day"
      ? 1
      : timeRange === "week"
        ? 7
        : timeRange === "month"
          ? 30
          : Math.floor((now - dateForRange("year", now)) / 86400000) + 1;
    const completedSessions = filteredSessions.filter((session) => session.status === "completed").length;
    const coursesWithQuizzes = syllabusData.filter((course) =>
      filteredQuizzes.some((quiz) => quiz.courseTitle === course.courseTitle),
    ).length;
    const loginStreak = Math.max(0, Number(user?.loginStreak ?? user?.settings?.loginStreak) || 0);

    return [
      { skill: "Quiz Accuracy", value: averageAccuracy, color: "primary" },
      { skill: "Study Consistency", value: rangeDays ? (activeDays / rangeDays) * 100 : 0, color: "info" },
      { skill: "Session Completion", value: filteredSessions.length ? (completedSessions / filteredSessions.length) * 100 : 0, color: "success" },
      { skill: "Course Coverage", value: syllabusData.length ? (coursesWithQuizzes / syllabusData.length) * 100 : 0, color: "warning" },
      { skill: "Weekly Login Streak", value: Math.min(loginStreak / 7, 1) * 100, color: "accent" },
    ];
  }, [filteredQuizzes, filteredSessions, syllabusData, timeRange, user?.loginStreak, user?.settings?.loginStreak]);

  const skillData = useMemo(() => ({
    labels: personaMetrics.map((metric) => metric.skill),
    datasets: [
      {
        label: "Study Habits",
        data: personaMetrics.map((metric) => Math.min(100, Math.max(0, metric.value))),
        backgroundColor: "rgba(121, 85, 72, 0.5)",
        borderColor: "rgba(121, 85, 72, 1)",
        pointBackgroundColor: "rgba(121, 85, 72, 1)",
      },
    ],
  }), [personaMetrics]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: { color: "#94a3b8", padding: 15, usePointStyle: true },
      },
    },
    cutout: "70%",
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      r: {
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        angleLines: { color: "rgba(255, 255, 255, 0.1)" },
        pointLabels: { color: "#94a3b8" },
        ticks: { display: false },
        min: 0,
        max: 100,
      },
    },
  };

  if (loading) {
    return (
      <div className="page-container d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Analytics Dashboard</h1>
            <p className="page-subtitle">Track your learning progress and performance</p>
          </div>
          <div className="d-flex gap-2">
            {["day", "week", "month", "year"].map((range) => (
              <button
                key={range}
                className="btn py-2"
                onClick={() => setTimeRange(range)}
                style={{
                  background: timeRange === range ? "#795548" : "white",
                  border: timeRange === range ? "none" : "1px solid rgba(0,0,0,0.08)",
                  color: timeRange === range ? "white" : "var(--text-primary)",
                  textTransform: "capitalize",
                  borderRadius: "0.75rem",
                  padding: "0.5rem 1.25rem",
                  fontWeight: "700",
                  transition: "all 0.2s ease"
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        {stats.map((stat, index) => (
          <div className="col-6 col-lg-3" key={index}>
            <div className={`stat-card animate-fade-in stagger-${index + 1}`}>
              <div className={`stat-icon ${stat.color}`}>
                <i className={`bi ${stat.icon}`}></i>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="mt-2" style={{ color: "var(--success)", fontSize: "0.75rem" }}>
                <i className="bi bi-arrow-up"></i> {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card" style={{ padding: "1.5rem", borderRadius: "1.25rem" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 fw-bold">Study Hours (This {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)})</h5>
              <i className="bi bi-info-circle text-muted" title="Focus time logged by the timer"></i>
            </div>
            <div style={{ height: "300px" }}>
              <Bar data={studyData} options={chartOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card" style={{ padding: "1.5rem", height: "100%", borderRadius: "1.25rem" }}>
            <h5 className="mb-4 fw-bold">Subject Breakdown</h5>
            <div style={{ height: "250px" }}>
              <Doughnut data={subjectBreakdown} options={doughnutOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card" style={{ padding: "1.5rem", borderRadius: "1.25rem" }}>
            <h5 className="mb-4 fw-bold">Quiz Scores Over Time</h5>
            <div style={{ height: "250px" }}>
              <Line data={quizData} options={chartOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card" style={{ padding: "1.5rem", borderRadius: "1.25rem" }}>
            <h5 className="mb-4 fw-bold">Quiz Accuracy by Course</h5>
            <div style={{ height: "250px" }}>
              <Bar data={progressData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Skills Radar */}
      <div className="row g-4 pb-4">
        <div className="col-12">
          <div className="card" style={{ padding: "1.5rem", borderRadius: "1.25rem" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 fw-bold">Academic Persona</h5>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Based on your study habits and assessments
              </span>
            </div>
            <div className="row g-4">
              <div className="col-md-6 border-end-md">
                <div style={{ height: "350px" }}>
                  <Radar data={skillData} options={radarOptions} />
                </div>
              </div>
              <div className="col-md-6 d-flex flex-column justify-content-center px-lg-5">
                {personaMetrics.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>{item.skill}</span>
                      <span style={{ color: `var(--${item.color})`, fontWeight: "700" }}>{Math.round(item.value)}%</span>
                    </div>
                    <div className="progress" style={{ height: "8px", borderRadius: "4px", background: "rgba(0,0,0,0.05)" }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.value))}%`,
                          background: `var(--${item.color})`,
                          borderRadius: "4px"
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
