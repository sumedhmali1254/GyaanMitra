import React, { useState, useContext, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import api, { API_ORIGIN } from "../services/api";

const ProfilePage = ({ isEmbedded = false }) => {
  const { user, token, fetchMe, logout } = useContext(AuthContext);
  const { syllabusData } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    avatar: null,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/sessions/stats");
        if (res.data.success) {
          setSessions(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching profile stats:", error);
      }
    };
    if (token) fetchStats();
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "",
        bio: user.bio || "",
        avatar: user.avatar || null,
      });
    }
  }, [user]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalValue =
      totalMinutes < 60
        ? `${totalMinutes} min`
        : `${(totalMinutes / 60).toFixed(1)} hrs`;

    // Dynamic Streak Calculation
    const activeDates = new Set();
    sessions.forEach((s) => {
      if (s.duration >= 5)
        activeDates.add(new Date(s.startTime).toDateString());
    });

    let streakCount = 0;
    if (activeDates.size > 0) {
      const checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);

      const todayStr = checkDate.toDateString();
      const yesterday = new Date(checkDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      const hasToday = activeDates.has(todayStr);
      const hasYesterday = activeDates.has(yesterdayStr);

      if (hasToday || hasYesterday) {
        let currentIter = hasToday ? checkDate : yesterday;
        while (activeDates.has(currentIter.toDateString())) {
          streakCount++;
          currentIter.setDate(currentIter.getDate() - 1);
        }
      }
    }

    return [
      {
        label: "Total Focus",
        value: totalValue,
        icon: "bi-hourglass-split",
        color: "primary",
      },
      {
        label: "Courses Managed",
        value: syllabusData.length.toString(),
        icon: "bi-book-half",
        color: "success",
      },
      {
        label: "Study Streak",
        value: `${streakCount} days`,
        icon: "bi-fire",
        color: "danger",
      },
      {
        label: "Learning Rank",
        value:
          sessions.length > 20
            ? "Elite Pro"
            : sessions.length > 5
              ? "Scholar"
              : "Novice",
        icon: "bi-graph-up",
        color: "warning",
      },
    ];
  }, [sessions, syllabusData]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return "Member since Jan 2024";
    const d = new Date(user.createdAt);
    const month = d.toLocaleString("default", { month: "short" });
    const year = d.getFullYear();
    return `Member since ${month} ${year}`;
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value,
    });
  };

  const handleAvatarChange = (e) => {
    setAvatarFile(e.target.files[0]);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const updateData = new FormData();
      updateData.append("firstName", profile.firstName);
      updateData.append("lastName", profile.lastName);
      updateData.append("phone", profile.phone);
      updateData.append("location", profile.location);
      updateData.append("bio", profile.bio);
      if (avatarFile) updateData.append("avatar", avatarFile);

      const res = await api.put("/auth/profile", updateData);

      toast.success("Profile updated successfully!");
      setIsEditing(false);

      // Refresh global state
      if (fetchMe) fetchMe();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setIsLoading(false);
    }
  };

  const fullName =
    `${profile.firstName} ${profile.lastName}`.trim() || "Learner";

  const content = (
    <>
      <div className="row g-4 animate-fade-in">
        {/* Left Column */}
        <div className="col-lg-4">
          <div className="card p-4 text-center animate-fade-in">
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                margin: "0 auto 1.5rem",
                fontSize: "3rem",
                color: "white",
                fontWeight: "bold",
                boxShadow: "0 8px 16px rgba(121, 85, 72, 0.3)",
                backgroundImage: profile.avatar
                  ? // [DEPLOYMENT UPDATE]: Resolve uploaded avatars from the configured backend.
                    `url(${profile.avatar.startsWith("http") ? profile.avatar : `${API_ORIGIN}${profile.avatar}`})`
                  : "linear-gradient(135deg, #795548 0%, #5d4037 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {!profile.avatar && (
                <span>{fullName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <h3 className="fw-bold mb-2">{fullName}</h3>
            <p className="text-muted mb-3">{profile.email}</p>

            <div className="d-flex justify-content-center flex-wrap gap-2 mb-4">
              <span
                className="badge rounded-pill"
                style={{
                  background: "#efebe9",
                  color: "#5d4037",
                  padding: "0.6rem 1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  border: "1px solid #d7ccc8",
                }}
              >
                <i
                  className="bi bi-star-fill me-2"
                  style={{ color: "#8d6e63" }}
                ></i>
                Premium Tier
              </span>
              <span
                className="badge rounded-pill"
                style={{
                  background: "#ecfdf5",
                  color: "#10b981",
                  padding: "0.6rem 1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  border: "1px solid #d1fae5",
                }}
              >
                <i
                  className="bi bi-calendar-check me-2"
                  style={{ color: "#34d399" }}
                ></i>
                {memberSince}
              </span>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="btn w-100 mb-3 shadow-sm"
              style={{
                background: "#795548",
                color: "white",
                padding: "0.75rem",
                border: "none",
                borderRadius: "0.75rem",
                fontWeight: "600",
              }}
            >
              <i className="bi bi-pencil me-2"></i>Edit Profile
            </button>

            <button
              onClick={logout}
              className="btn w-100 fw-bold shadow-sm"
              style={{
                background: "#fdf2f2",
                color: "#dc2626",
                border: "1px solid #fee2e2",
                padding: "0.75rem",
                borderRadius: "0.75rem",
              }}
            >
              <i className="bi bi-box-arrow-right me-2"></i>Sign Out
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-8">
          {isEditing ? (
            <div className="card p-4">
              <h4 className="fw-bold mb-4">Edit Profile</h4>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="firstName"
                    value={profile.firstName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="lastName"
                    value={profile.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted">
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    disabled
                    style={{ background: "#f8fafc" }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted">
                    Avatar Image
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted">
                    Location
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="location"
                    value={profile.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Mumbai, India"
                  />
                </div>
              </div>
              <div className="row mb-4">
                <div className="col-md-12">
                  <label className="form-label fw-bold small text-muted">
                    Short Bio
                  </label>
                  <textarea
                    className="form-control"
                    name="bio"
                    value={profile.bio}
                    onChange={handleInputChange}
                    placeholder="Write a few lines about your study goals..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="btn shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, #795548 0%, #5d4037 100%)",
                    color: "white",
                    padding: "0.75rem 2rem",
                    borderRadius: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn"
                  style={{
                    background: "#f1f5f9",
                    color: "#1e293b",
                    padding: "0.75rem 2rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="row g-3 mb-4">
                {stats.map((stat, i) => (
                  <div key={i} className="col-sm-6">
                    <div
                      className="card p-3"
                      style={{
                        borderRadius: "1rem",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "0.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background:
                              stat.color === "primary"
                                ? "rgba(121, 85, 72, 0.1)"
                                : stat.color === "success"
                                  ? "rgba(16, 185, 129, 0.1)"
                                  : stat.color === "danger"
                                    ? "rgba(239, 68, 68, 0.1)"
                                    : "rgba(245, 158, 11, 0.1)",
                            color:
                              stat.color === "primary"
                                ? "#795548"
                                : stat.color === "success"
                                  ? "#10b981"
                                  : stat.color === "danger"
                                    ? "#ef4444"
                                    : "#f59e0b",
                          }}
                        >
                          <i
                            className={`bi ${stat.icon}`}
                            style={{ fontSize: "1.25rem" }}
                          />
                        </div>
                        <div>
                          <div
                            style={{ fontSize: "1.25rem", fontWeight: "700" }}
                          >
                            {stat.value}
                          </div>
                          <div
                            style={{ fontSize: "0.875rem", color: "#64748b" }}
                          >
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div
                className="card border-0 shadow-sm p-4 mb-4"
                style={{ borderRadius: "1rem" }}
              >
                <h5 className="fw-bold mb-4 text-dark-emphasis border-bottom pb-3">
                  Personal Information
                </h5>
                <div className="row g-4">
                  <div className="col-md-6 border-end-md">
                    <div className="d-flex align-items-center mb-2 text-muted">
                      <i className="bi bi-envelope me-2"></i>
                      <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                        Email Address
                      </span>
                    </div>
                    <p
                      style={{
                        fontWeight: "500",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {profile.email}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2 text-muted">
                      <i className="bi bi-telephone ms-md-2 me-2"></i>
                      <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                        Phone Number
                      </span>
                    </div>
                    <p
                      className="ms-md-4"
                      style={{
                        fontWeight: "500",
                        color: profile.phone
                          ? "var(--text-primary)"
                          : "#94a3b8",
                        margin: 0,
                      }}
                    >
                      {profile.phone || "Not set"}
                    </p>
                  </div>
                  <div className="col-md-6 border-end-md pt-md-3">
                    <div className="d-flex align-items-center mb-2 text-muted">
                      <i className="bi bi-geo-alt me-2"></i>
                      <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                        Location
                      </span>
                    </div>
                    <p
                      style={{
                        fontWeight: "500",
                        color: profile.location
                          ? "var(--text-primary)"
                          : "#94a3b8",
                        margin: 0,
                      }}
                    >
                      {profile.location || "Not set"}
                    </p>
                  </div>
                  <div className="col-md-6 pt-md-3">
                    <div className="d-flex align-items-center mb-2 text-muted">
                      <i className="bi bi-person-lines-fill ms-md-2 me-2"></i>
                      <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                        Bio
                      </span>
                    </div>
                    <p
                      className="ms-md-4"
                      style={{
                        fontWeight: "500",
                        color: profile.bio ? "var(--text-primary)" : "#94a3b8",
                        margin: 0,
                      }}
                    >
                      {profile.bio || "No bio set yet."}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (isEmbedded) return content;

  return (
    <div className="page-container">
      <div className="page-header mb-5">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">
          Manage your personal information and preferences
        </p>
      </div>
      {content}
    </div>
  );
};

export default ProfilePage;
