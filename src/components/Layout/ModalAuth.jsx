// src/components/Layout/ModalAuth.jsx
import React, { useState } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../services/auth";

/** Small helper until you integrate OAuth */
const notImplemented = () => alert("Coming soon!");

function ModalAuth() {
  const { user, initializing } = useAuth();
  const [tab, setTab] = useState("login");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- handlers ---------------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(loginData.username, loginData.password);
      window.location.reload();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.register(registerData);
      await api.login(registerData.username, registerData.password);
      window.location.reload();
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* ----------- don’t render if already logged-in ----------- */
  const shouldShow = !initializing && !user;
  if (!shouldShow) return null;

  /* ---------------- shared bits ---------------- */
  const socialButtons = (
    <div className="social-login">
      <button type="button" className="facebook" onClick={notImplemented}>
        <i className="fab fa-facebook-f"></i>
      </button>
      <button type="button" className="google" onClick={notImplemented}>
        <i className="fab fa-google"></i>
      </button>
      <button type="button" className="linkedin" onClick={notImplemented}>
        <i className="fab fa-linkedin-in"></i>
      </button>
    </div>
  );

  return (
    <div
      className="modal fade show d-block auth-modal"
      id="loginModal"
      tabIndex="-1"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-md">
        <div className="modal-content">
          {/* ---------- Modal header ---------- */}
          <div className="modal-header justify-content-center">
            <h5 className="modal-title">Vidavox Document Intelligence</h5>
          </div>

          {/* ---------- Tabs ---------- */}
          <ul className="nav nav-tabs" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link ${tab === "login" ? "active" : ""}`}
                onClick={() => setTab("login")}
              >
                <i className="fas fa-sign-in-alt me-2"></i>
                Login
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${tab === "register" ? "active" : ""}`}
                onClick={() => setTab("register")}
              >
                <i className="fas fa-user-plus me-2"></i>
                Register
              </button>
            </li>
          </ul>

          {/* ---------- Body ---------- */}
          <div className="modal-body tab-content">
            {error && <div className="alert alert-danger">{error}</div>}

            {/* -------- Login Tab -------- */}
            {tab === "login" && (
              <div className="tab-pane fade show active">
                <div className="text-center mb-4">
                  <div className="icon-badge">
                    <i className="fas fa-lock"></i>
                  </div>
                  <h4>Sign In</h4>
                  <p className="text-muted">Access your account to continue</p>
                </div>

                <form onSubmit={handleLogin} id="login-form">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Username"
                      required
                      value={loginData.username}
                      onChange={(e) =>
                        setLoginData({ ...loginData, username: e.target.value })
                      }
                    />
                    <label>
                      <i className="fas fa-user me-2"></i>Username
                    </label>
                  </div>

                  <div className="form-floating mb-4">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Password"
                      required
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                    />
                    <label>
                      <i className="fas fa-key me-2"></i>Password
                    </label>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="remember-me"
                      />
                      <label className="form-check-label" htmlFor="remember-me">
                        Remember me
                      </label>
                    </div>
                    <a href="#" className="text-primary">
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2"
                    disabled={loading}
                  >
                    <i className="fas fa-sign-in-alt me-2"></i>
                    {loading ? "Logging in…" : "Login"}
                  </button>
                </form>

                {/* Divider + social */}
                <div className="form-divider">
                  <span>or continue with</span>
                </div>
                {socialButtons}

                <div className="form-help">
                  Don’t have an account?{" "}
                  <a href="#" onClick={() => setTab("register")}>
                    Register now
                  </a>
                </div>
              </div>
            )}

            {/* -------- Register Tab -------- */}
            {tab === "register" && (
              <div className="tab-pane fade show active">
                <div className="text-center mb-4">
                  <div className="icon-badge">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <h4>Create Account</h4>
                  <p className="text-muted">
                    Join us today to analyze your documents
                  </p>
                </div>

                <form onSubmit={handleRegister} id="register-form">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Username"
                      required
                      value={registerData.username}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          username: e.target.value,
                        })
                      }
                    />
                    <label>
                      <i className="fas fa-user me-2"></i>Username
                    </label>
                  </div>

                  <div className="form-floating mb-3">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Email"
                      required
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      }
                    />
                    <label>
                      <i className="fas fa-envelope me-2"></i>Email address
                    </label>
                  </div>

                  <div className="form-floating mb-4">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Password"
                      required
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                    />
                    <label>
                      <i className="fas fa-key me-2"></i>Password
                    </label>
                  </div>

                  <div className="form-check mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="terms-agree"
                      required
                    />
                    <label className="form-check-label" htmlFor="terms-agree">
                      I agree to the <a href="#">Terms of Service</a> and{" "}
                      <a href="#">Privacy Policy</a>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-success w-100 py-2"
                    disabled={loading}
                  >
                    <i className="fas fa-user-plus me-2"></i>
                    {loading ? "Registering…" : "Create Account"}
                  </button>
                </form>

                {/* Divider + social */}
                <div className="form-divider">
                  <span>or sign up with</span>
                </div>
                {socialButtons}

                <div className="form-help">
                  Already have an account?{" "}
                  <a href="#" onClick={() => setTab("login")}>
                    Log in
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalAuth;
