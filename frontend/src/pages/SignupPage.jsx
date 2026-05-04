import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { useNotifications } from "../context/NotificationContext";

const SignupPage = () => {
  const { login } = useContext(AuthContext);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAvatarChange = (e) => {
    setAvatarFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.agreeTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    try {
      setIsLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      if (formData.phone) formDataToSend.append("phone", formData.phone);
      if (formData.location) formDataToSend.append("location", formData.location);

      if (avatarFile) {
        formDataToSend.append("avatar", avatarFile);
      }

      const res = await api.post("/auth/register", formDataToSend);

      login(res.data.data);
      const fname = res.data.data.firstName || formData.firstName;
      toast.success(`Welcome to GyaanMitra, ${fname}!`);
      addNotification({
        type: "success",
        title: "Welcome to GyaanMitra!",
        message: `Welcome aboard, ${res.data.data.username || formData.firstName}! Your learning journey begins now.`,
        icon: "bi-stars",
      });
      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Signup failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{
        background:
          "linear-gradient(135deg, #fdfbfb 0%, #ebedee 50%, #f4f1ee 100%)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem 0",
      }}
    >
      {/* Background Decorations */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-5%",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(255, 250, 240, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "-10%",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(121, 85, 72, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      ></div>

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div
              className="card animate-fade-in"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "1.5rem",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                overflow: "hidden",
              }}
            >
              <div className="row g-0">
                {/* Left Side - Branding */}
                <div
                  className="col-lg-5 d-none d-lg-block"
                  style={{
                    background:
                      "linear-gradient(135deg, #a1887f 0%, #795548 100%)",
                    padding: "3rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div className="text-center text-white">
                    <img src="/gyaanmitra_mainlogo.png" alt="GyaanMitra" style={{ width: '220px', marginBottom: '2rem' }} />
                    <h6 className="mb-3 text-uppercase ls-wide" style={{ color: "white", fontSize: "0.9rem", opacity: 0.8 }}>
                      Join GyaanMitra
                    </h6>
                    <p
                      style={{
                        color: "white",
                        opacity: 0.8,
                        fontSize: "0.85rem",
                        lineHeight: 1.6,
                      }}
                    >
                      Start your learning journey today. Access thousands of
                      courses, track your progress, and achieve your goals.
                    </p>
                    <div className="mt-5">
                      <div className="d-flex justify-content-center gap-4">
                        <div>
                          <div className="fw-bold" style={{ fontSize: "1.25rem" }}>
                            10K+
                          </div>
                          <div style={{ opacity: 0.7, fontSize: "0.75rem" }}>
                            Students
                          </div>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: "1.25rem" }}>
                            500+
                          </div>
                          <div style={{ opacity: 0.7, fontSize: "0.75rem" }}>
                            Courses
                          </div>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: "1.25rem" }}>
                            50+
                          </div>
                          <div style={{ opacity: 0.7, fontSize: "0.75rem" }}>
                            Instructors
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Form */}
                <div className="col-lg-7" style={{ padding: "2.5rem" }}>
                  <div className="mb-4">
                    <h2 className="fw-bold mb-0" style={{ color: "#1e293b", fontSize: '1.25rem' }}>
                      Create Account
                    </h2>
                    <p style={{ color: "#64748b", marginBottom: 0 }}>
                      Fill in your details to get started
                    </p>
                  </div>

                  <form onSubmit={handleSubmit}>
                    {/* Avatar Upload */}
                    <div className="text-center mb-4">
                      <div className="position-relative d-inline-block">
                        <div
                          style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            background: avatarFile 
                              ? `url(${URL.createObjectURL(avatarFile)}) center/cover`
                              : "#efebe9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px dashed #d7ccc8",
                            cursor: "pointer",
                            overflow: "hidden"
                          }}
                          onClick={() => document.getElementById("avatarInput").click()}
                        >
                          {!avatarFile && <i className="bi bi-camera text-muted" style={{ fontSize: "1.5rem" }}></i>}
                        </div>
                        <input
                          type="file"
                          id="avatarInput"
                          className="d-none"
                          accept="image/*"
                          onChange={handleAvatarChange}
                        />
                        <div
                          className="position-absolute bottom-0 end-0 bg-white shadow-sm d-flex align-items-center justify-content-center"
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: "1px solid #e2e8f0"
                          }}
                        >
                          <i className="bi bi-plus" style={{ color: "#795548", fontSize: "0.8rem" }}></i>
                        </div>
                      </div>
                      <p className="small text-muted mt-2">Add Profile Picture (Optional)</p>
                    </div>

                    {/* Name Fields */}
                    <div className="row mb-3">
                      <div className="col-6">
                        <label
                          className="form-label"
                          style={{ color: "#475569", fontWeight: 500 }}
                        >
                          First Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          className="form-control shadow-none"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.75rem",
                            fontSize: "0.9rem"
                          }}
                        />
                      </div>
                      <div className="col-6">
                        <label
                          className="form-label"
                          style={{ color: "#475569", fontWeight: 500 }}
                        >
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          className="form-control shadow-none"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.75rem",
                            fontSize: "0.9rem"
                          }}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mb-3">
                      <label
                        className="form-label"
                        style={{ color: "#475569", fontWeight: 500 }}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        className="form-control shadow-none"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          padding: "0.75rem 1rem",
                          borderRadius: "0.75rem",
                          fontSize: "0.9rem"
                        }}
                      />
                    </div>

                    {/* Extended Info (Optional) */}
                    <div className="row mb-3">
                      <div className="col-6">
                        <label
                          className="form-label"
                          style={{ color: "#475569", fontWeight: 500 }}
                        >
                          Phone (Optional)
                        </label>
                        <input
                          type="text"
                          name="phone"
                          className="form-control shadow-none"
                          placeholder="+91..."
                          onChange={handleChange}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.75rem",
                            fontSize: "0.9rem"
                          }}
                        />
                      </div>
                      <div className="col-6">
                        <label
                          className="form-label"
                          style={{ color: "#475569", fontWeight: 500 }}
                        >
                          Location (Optional)
                        </label>
                        <input
                          type="text"
                          name="location"
                          className="form-control shadow-none"
                          placeholder="City, Country"
                          onChange={handleChange}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.75rem",
                            fontSize: "0.9rem"
                          }}
                        />
                      </div>
                    </div>

                    {/* Password Fields */}
                    <div className="row mb-3">
                      <div className="col-6">
                        <label
                          className="form-label"
                          style={{ color: "#475569", fontWeight: 500 }}
                        >
                          Password
                        </label>
                        <div className="position-relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            className="form-control"
                            placeholder="Min 8 characters"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={8}
                            style={{
                              background: "#f8fafc",
                              border: "2px solid #e2e8f0",
                              padding: "0.75rem 1rem 0.75rem 2.5rem",
                              borderRadius: "0.75rem",
                              color: "#1e293b",
                            }}
                          />
                          <i
                            className="bi bi-lock position-absolute"
                            style={{
                              left: "0.875rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#94a3b8",
                            }}
                          ></i>
                        </div>
                      </div>
                      <div className="col-6">
                        <label
                          className="form-label"
                          style={{ color: "#475569", fontWeight: 500 }}
                        >
                          Confirm Password
                        </label>
                        <div className="position-relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            className="form-control"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            style={{
                              background: "#f8fafc",
                              border: "2px solid #e2e8f0",
                              padding: "0.75rem 1rem 0.75rem 2.5rem",
                              borderRadius: "0.75rem",
                              color: "#1e293b",
                            }}
                          />
                          <i
                            className="bi bi-lock-fill position-absolute"
                            style={{
                              left: "0.875rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#94a3b8",
                            }}
                          ></i>
                        </div>
                      </div>
                    </div>

                    {/* Show Password Toggle */}
                    <div className="d-flex align-items-center mb-4">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="showPassword"
                        checked={showPassword}
                        onChange={() => setShowPassword(!showPassword)}
                        style={{
                          accentColor: "#795548",
                          width: "16px",
                          height: "16px",
                          marginRight: "0.5rem",
                        }}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="showPassword"
                        style={{ color: "#64748b", fontSize: "0.875rem" }}
                      >
                        Show password
                      </label>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="d-flex align-items-start mb-4">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        className="form-check-input mt-1"
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        style={{
                          accentColor: "#795548",
                          width: "18px",
                          height: "18px",
                          marginRight: "0.75rem",
                        }}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="agreeTerms"
                        style={{
                          color: "#64748b",
                          fontSize: "0.9rem",
                          lineHeight: 1.5,
                        }}
                      >
                        I agree to the{" "}
                        <a href="#" style={{ color: "#795548" }}>
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" style={{ color: "#795548" }}>
                          Privacy Policy
                        </a>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn w-100 py-3 mb-4"
                      disabled={isLoading}
                      style={{
                        background:
                          "linear-gradient(135deg, #795548 0%, #3e2723 100%)",
                        borderRadius: "0.75rem",
                        fontWeight: 600,
                        fontSize: "1rem",
                        color: "white",
                        boxShadow: "0 8px 20px rgba(121, 85, 72, 0.3)",
                      }}
                    >
                      {isLoading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                          ></span>
                          Creating account...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-person-plus me-2"></i>
                          Create Account
                        </>
                      )}
                    </button>

                    {/* Sign In Link */}
                    <p
                      className="text-center mb-0"
                      style={{ color: "#64748b" }}
                    >
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        style={{ color: "#795548", fontWeight: 600 }}
                      >
                        Sign in
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
