import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";

const LoginPage = () => {
  const { login, guestLogin } = useContext(AuthContext);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const res = await api.post("/auth/login", {
        email,
        password,
      });

      login(res.data.data);
      const fname =
        res.data.data.firstName || res.data.data.username || "Learner";
      toast.success(`Welcome back to GyaanMitra, ${fname}!`);
      addNotification({
        type: "success",
        title: "Welcome back!",
        message: `Happy to see you again, ${fname}! Ready to resume your learning adventure?`,
        icon: "bi-stars",
      });
      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setIsGuestLoading(true);
      const res = await api.post("/auth/guest");
      guestLogin(res.data.data);
      toast.success("Guest access started for 10 minutes.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to start guest access.",
      );
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{
        background:
          "linear-gradient(135deg, #fefeff 0%, #f7f3f0 50%, #eee1da 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Decorations */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "5%",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(255, 250, 240, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(121, 85, 72, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      ></div>

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div
              className="card animate-fade-in"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "1.5rem",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                padding: "2.5rem",
              }}
            >
              {/* Logo */}
              <div className="text-center mb-4">
                <img
                  src="/gyaanmitra_mainlogo.png"
                  alt="GyaanMitra"
                  style={{ width: "180px", marginBottom: "1.5rem" }}
                />
                <p
                  className="mb-1"
                  style={{ color: "#1e293b", fontSize: "1.1rem" }}
                >
                  Welcome Back
                </p>
                <p style={{ color: "#64748b", marginBottom: 0 }}>
                  Sign in to continue your learning journey
                </p>
              </div>

              <div
                className="mb-4 p-3 text-center"
                style={{
                  background: "#fff7f3",
                  border: "1px solid #ead8d0",
                  borderRadius: "0.85rem",
                }}
              >
                <div className="fw-semibold mb-1" style={{ color: "#5d4037" }}>
                  Explore without an account
                </div>
                <div className="small mb-3" style={{ color: "#795548" }}>
                  Use the whole website for 15 minutes. Your activity will not be saved.
                </div>
                <button
                  type="button"
                  className="btn w-100 py-2"
                  disabled={isLoading || isGuestLoading}
                  onClick={handleGuestLogin}
                  style={{
                    background: "#fff",
                    border: "1px solid #795548",
                    borderRadius: "0.65rem",
                    color: "#795548",
                    fontWeight: 600,
                  }}
                >
                  {isGuestLoading ? "Starting guest access..." : "Continue as Guest"}
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{ color: "#475569", fontWeight: 500 }}
                  >
                    Email Address
                  </label>
                  <div className="position-relative">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        background: "#f8fafc",
                        border: "2px solid #e2e8f0",
                        padding: "0.875rem 1rem 0.875rem 2.75rem",
                        borderRadius: "0.75rem",
                        color: "#1e293b",
                        fontSize: "1rem",
                      }}
                    />
                    <i
                      className="bi bi-envelope position-absolute"
                      style={{
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    ></i>
                  </div>
                </div>

                {/* Password Field */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label
                      className="form-label"
                      style={{
                        color: "#475569",
                        fontWeight: 500,
                        marginBottom: 0,
                      }}
                    >
                      Password
                    </label>
                    <a
                      href="#"
                      style={{
                        color: "#795548",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="position-relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        background: "#f8fafc",
                        border: "2px solid #e2e8f0",
                        padding: "0.875rem 1rem 0.875rem 2.75rem",
                        borderRadius: "0.75rem",
                        color: "#1e293b",
                        fontSize: "1rem",
                      }}
                    />
                    <i
                      className="bi bi-lock position-absolute"
                      style={{
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    ></i>
                    <button
                      type="button"
                      className="btn position-absolute"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      <i
                        className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
                        style={{ color: "#94a3b8" }}
                      ></i>
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="d-flex align-items-center mb-4">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMe"
                    style={{
                      backgroundColor: "#f8fafc",
                      borderColor: "#e2e8f0",
                      accentColor: "#795548",
                      width: "18px",
                      height: "18px",
                      marginRight: "0.5rem",
                    }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="rememberMe"
                    style={{ color: "#64748b", fontSize: "0.9rem" }}
                  >
                    Remember me
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn w-100 py-3 mb-4"
                  disabled={isLoading}
                  style={{
                    background:
                      "linear-gradient(135deg, #795548 0%, #5d4037 100%)",
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Sign In
                    </>
                  )}
                </button>

                {/* Sign Up Link */}
                <p className="text-center mb-0" style={{ color: "#64748b" }}>
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    style={{ color: "#795548", fontWeight: 600 }}
                  >
                    Sign up free
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
