import React, { useContext, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { AuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const { syllabusData } = useSettings();
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizCourse, setSelectedQuizCourse] = useState("all");

  const firstName = user?.firstName || user?.username?.split(" ")[0] || user?.name?.split(" ")[0] || "Learner";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, notesRes, quizRes] = await Promise.all([
          api.get("/sessions/stats"),
          api.get("/notes"),
          api.get("/quiz/stats")
        ]);

        if (statsRes.data.success) {
          setSessions(statsRes.data.data);
        }
        if (notesRes.data.success) {
          setNotes(notesRes.data.data);
        }
        if (quizRes.data.success) {
          setQuizResults(quizRes.data.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const [studyPeriod, setStudyPeriod] = useState("week");
  const [quizPeriod, setQuizPeriod] = useState("week");

  // Aggregate Study Hours by Day
  const studyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let labels = [];
    let counts = [];
    let filterDays = 7;
    let offset = 0;

    if (studyPeriod === "week") {
      filterDays = 7;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        labels.push(days[d.getDay()]);
      }
      counts = new Array(7).fill(0);
    } else if (studyPeriod === "last-week") {
      filterDays = 14;
      offset = 7;
      for (let i = 13; i >= 7; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        labels.push(days[d.getDay()]);
      }
      counts = new Array(7).fill(0);
    } else { // month
      filterDays = 30;
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (i % 5 === 0) labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
        else labels.push("");
      }
      counts = new Array(30).fill(0);
    }

    sessions.forEach(s => {
      const date = new Date(s.startTime);
      const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));

      if (studyPeriod === "month") {
        if (diffDays >= 0 && diffDays < 30) {
          counts[29 - diffDays] += (s.duration / 60);
        }
      } else {
        const checkIdx = (filterDays - 1 - diffDays);
        if (diffDays >= offset && diffDays < filterDays) {
          const arrIdx = (studyPeriod === "last-week") ? (diffDays - 7) : diffDays;
          const finalIdx = (studyPeriod === "last-week") ? (6 - arrIdx) : (6 - arrIdx);
          if (finalIdx >= 0 && finalIdx < 7) counts[finalIdx] += (s.duration / 60);
        }
      }
    });

    return {
      labels: labels,
      datasets: [{
        label: "Hours",
        data: counts.map(h => parseFloat(h.toFixed(1))),
        backgroundColor: "rgba(121, 85, 72, 0.6)",
        borderColor: "rgba(121, 85, 72, 1)",
        borderWidth: 2,
        borderRadius: 8,
      }]
    };
  }, [sessions, studyPeriod]);

  const progressData = useMemo(() => {
    const hasData = notes.length > 0;

    const completed = notes.filter(n => n.done).length;
    const inProgress = notes.filter(n => !n.done && n.pinned).length;
    const notStarted = notes.filter(n => !n.done && !n.pinned).length;

    return {
      labels: ["Completed", "In Progress", "Not Started"],
      datasets: [
        {
          data: hasData
            ? [completed, inProgress, notStarted]
            : [0, 0, 1],
          backgroundColor: hasData ? [
            "rgba(34, 197, 94, 0.8)",
            "rgba(245, 158, 11, 0.8)",
            "rgba(100, 116, 139, 0.8)",
          ] : ["rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.1)"],
          borderColor: hasData ? [
            "rgba(34, 197, 94, 1)",
            "rgba(245, 158, 11, 1)",
            "rgba(100, 116, 139, 1)",
          ] : ["transparent", "transparent", "rgba(0, 0, 0, 0.1)"],
          borderWidth: hasData ? 2 : 1,
        },
      ],
    };
  }, [notes]);

  const performanceData = useMemo(() => {
    let filtered = [...quizResults];
    if (selectedQuizCourse !== "all") {
      filtered = filtered.filter(r => r.courseTitle === selectedQuizCourse);
    }

    // Sort results by date
    const sortedResults = filtered.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    const hasResults = sortedResults.length > 0;

    const labels = hasResults
      ? sortedResults.map((r, i) => {
        const d = new Date(r.completedAt);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      })
      : ["Aug 1", "Aug 2", "Aug 3", "Aug 4"];

    const data = hasResults
      ? sortedResults.map(r => r.accuracy)
      : [0, 0, 0, 0];

    return {
      labels,
      datasets: [
        {
          label: "Quiz Score %",
          data: data,
          fill: true,
          backgroundColor: hasResults ? "rgba(121, 85, 72, 0.1)" : "rgba(100, 116, 139, 0.05)",
          borderColor: hasResults ? "rgba(121, 85, 72, 1)" : "rgba(100, 116, 139, 0.2)",
          tension: 0.4,
          pointRadius: hasResults ? 4 : 2,
          pointBackgroundColor: hasResults ? "#fff" : "transparent",
          pointBorderWidth: hasResults ? 2 : 0,
        },
      ],
    };
  }, [quizResults, selectedQuizCourse]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "#94a3b8",
          font: { size: 10 }
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#94a3b8",
          stepSize: 20,
          callback: (value) => `${value}%`
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#94a3b8",
          padding: 15,
          usePointStyle: true,
        },
      },
    },
    cutout: "70%",
  };

  // General Stats
  const statsOverview = useMemo(() => {
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const completedCount = sessions.filter(s => s.status === "completed").length;

    return [
      {
        label: "Study Time",
        value: totalMinutes < 60 ? `${totalMinutes}m` : `${(totalMinutes / 60).toFixed(1)}h`,
        change: "Active Goal",
        icon: "bi-clock-history",
        color: "primary",
      },
      {
        label: "Focus Sessions",
        value: sessions.length.toString(),
        change: `+${completedCount} done`,
        icon: "bi-lightning-charge",
        color: "success",
      }
    ];
  }, [sessions]);

  const stats = useMemo(() => {
    let streakCount = user?.settings?.loginStreak || 0;

    return [
      ...statsOverview,
      {
        label: "Courses Managed",
        value: syllabusData.length.toString(),
        change: "Synced",
        icon: "bi-book-half",
        color: "warning",
      },
      {
        label: "Current Streak",
        value: `${streakCount} days`,
        change: streakCount > 0 ? "+100%" : "Start today!",
        icon: "bi-fire",
        color: "info",
      },
    ];
  }, [statsOverview, syllabusData, sessions]);

  const quickActions = [
    {
      to: "/quiz",
      label: "Start Quiz",
      icon: "bi-lightning-charge",
      color: "primary",
    },
    {
      to: "/flashcards",
      label: "Review Cards",
      icon: "bi-stack",
      color: "success",
    },
    {
      to: "/timer",
      label: "Focus Session",
      icon: "bi-alarm",
      color: "warning",
    },
    {
      to: "/notes",
      label: "Add Notes",
      icon: "bi-plus-circle",
      color: "info",
    },
  ];

  const upcomingTasks = useMemo(() => {
    return notes
      .filter((n) => !n.done)
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) // Pinned first
      .slice(0, 3)
      .map((n) => ({
        title: n.text,
        subject: n.category.charAt(0).toUpperCase() + n.category.slice(1),
        due: new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        priority: n.pinned ? "high" : "medium",
      }));
  }, [notes]);

  if (loading && sessions.length === 0) {
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
      {/* Welcome Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Welcome back, {firstName}!</h1>
          <p className="page-subtitle">
            Ready to continue your learning journey?
          </p>
        </div>
        <div className="d-none d-md-block">
          <Link
            to="/timer"
            className="btn btn-primary"
            style={{
              padding: "0.75rem 1.5rem",
              fontWeight: "600"
            }}
          >
            <i className="bi bi-play-fill me-2"></i>
            Start Focus
          </Link>
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
              <div
                className="mt-2"
                style={{ color: "var(--success)", fontSize: "0.75rem" }}
              >
                <i className="bi bi-arrow-up"></i> {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <h5 className="mb-3" style={{ color: "var(--text-secondary)" }}>
            Quick Actions
          </h5>
          <div className="row g-3">
            {quickActions.map((action, index) => (
              <div className="col-6 col-md-3" key={index}>
                <Link
                  to={action.to}
                  className="card h-100 text-decoration-none"
                  style={{ padding: "1.25rem", textAlign: "center" }}
                >
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{
                      width: "50px",
                      height: "50px",
                      background: action.color === 'primary' ? 'rgba(121, 85, 72, 0.1)' :
                        action.color === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                          action.color === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                            'rgba(59, 130, 246, 0.1)',
                      boxShadow: "none",
                    }}
                  >
                    <i className={`bi ${action.icon}`} style={{ color: `var(--${action.color})`, fontSize: "1.25rem" }}></i>
                  </div>
                  <div
                    style={{ color: "var(--text-primary)", fontWeight: "500" }}
                  >
                    {action.label}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card" style={{ padding: "1.5rem" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">
                {studyPeriod === "week" ? "Study Hours This Week" :
                  studyPeriod === "last-week" ? "Study Hours Last Week" :
                    "Study Hours This Month"}
              </h5>
              <select
                className="form-select"
                value={studyPeriod}
                onChange={(e) => setStudyPeriod(e.target.value)}
                style={{
                  width: "auto",
                  background: "var(--bg-secondary)",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  borderRadius: "var(--radius-md)"
                }}
              >
                <option value="week">This Week</option>
                <option value="last-week">Last Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div style={{ height: "250px" }}>
              <Bar data={studyData} options={chartOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card" style={{ padding: "1.5rem", height: "100%" }}>
            <h5 className="mb-4">Task Progress</h5>
            <div style={{ height: "200px" }}>
              <Doughnut data={progressData} options={doughnutOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Saved Courses Section (Image 3) */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card" style={{ padding: "1.5rem" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-1">Saved Courses</h5>
                <p className="text-muted small mb-0">View and manage your global study curriculum.</p>
              </div>
              <Link
                to="/settings?tab=manage"
                className="btn btn-sm btn-outline-primary"
                style={{ borderRadius: "20px", fontWeight: "600" }}
              >
                Manage courses <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>

            <div className="row g-3">
              {syllabusData.length > 0 ? (
                syllabusData.slice(0, 4).map((course, idx) => (
                  <div key={idx} className="col-12 col-md-6 col-lg-3">
                    <div
                      className="p-3 d-flex align-items-center"
                      style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}
                    >
                      <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: "40px", height: "40px", background: "rgba(121, 85, 72, 0.1)", color: "var(--primary)" }}>
                        <i className={`bi ${course.type === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-journal-text'}`}></i>
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <div className="fw-bold text-truncate" style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                          {course.courseTitle || course.subject || "Untitled Course"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <div className="py-4 text-center opacity-75">
                    <i className="bi bi-folder-x fs-1 text-muted d-block mb-2"></i>
                    <p className="mb-0">
                      No courses saved yet. Start by uploading a PDF or adding courses Manually in Settings.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance & Tasks Row */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card h-100" style={{ padding: "1.5rem", minHeight: "380px", display: "flex", flexDirection: "column" }}>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <h5 className="mb-0">Quiz Performance</h5>
              <div className="d-flex align-items-center gap-2 ms-auto">
                <select
                  className="form-select form-select-sm"
                  value={selectedQuizCourse}
                  onChange={(e) => setSelectedQuizCourse(e.target.value)}
                  style={{ width: 'auto', minWidth: '120px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <option value="all">All Subjects</option>
                  {[...new Set(quizResults.map(r => r.courseTitle))].map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  value={quizPeriod}
                  onChange={(e) => setQuizPeriod(e.target.value)}
                  style={{ width: 'auto', minWidth: '100px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>
            <div className="flex-grow-1" style={{ height: "240px" }}>
              <Line data={performanceData} options={chartOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100" style={{ padding: "1.5rem", minHeight: "380px", display: "flex", flexDirection: "column" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">Upcoming Tasks</h5>
              <Link
                to="/notes"
                style={{ color: "var(--primary-light)", fontSize: "0.875rem" }}
              >
                View All <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            <div className="flex-grow-1">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task, index) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between align-items-center p-3 mb-2"
                    style={{
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-lg)",
                      borderLeft: `3px solid ${task.priority === "high"
                        ? "var(--danger)"
                        : task.priority === "medium"
                          ? "var(--warning)"
                          : "var(--success)"
                        }`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {task.subject}
                      </div>
                    </div>
                    <div className="text-end">
                      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        {task.due}
                      </div>
                      <span
                        className="badge"
                        style={{
                          background:
                            task.priority === "high"
                              ? "rgba(239, 68, 68, 0.2)"
                              : task.priority === "medium"
                                ? "rgba(245, 158, 11, 0.2)"
                                : "rgba(34, 197, 94, 0.2)",
                          color:
                            task.priority === "high"
                              ? "var(--danger)"
                              : task.priority === "medium"
                                ? "var(--warning)"
                                : "var(--success)",
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 py-4 opacity-75">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                    style={{ width: "64px", height: "64px", background: "rgba(121, 85, 72, 0.05)", border: "1px dashed rgba(121, 85, 72, 0.2)" }}
                  >
                    <i className="bi bi-journal-check text-primary" style={{ fontSize: "1.5rem" }}></i>
                  </div>
                  <h6 className="fw-bold mb-1">No pending tasks</h6>
                  <p className="text-center text-muted small px-4">All clear! Add new notes or to-dos to keep track of your performance.</p>
                  <Link to="/notes" className="btn btn-sm btn-outline-primary mt-2" style={{ borderRadius: "20px", fontSize: "0.75rem" }}>
                    Create Task
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
