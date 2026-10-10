import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import "./Login.css";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", role: "user" });

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = e => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return alert("Passwords do not match");
    localStorage.setItem("user", JSON.stringify({ username: form.username, email: form.email, role: "user" }));
    navigate("/dashboard");
  };

  return (
    <div className="auth-modern-page">
      {/* LEFT SIDE HERO - MODERN WHITE */}
      <div className="auth-left-hero">
        <div className="hero-brand">
          <Link to="/" className="logo-white-theme">
            Smart<span>Rent</span>
          </Link>
          <span className="badge-pill">✨ Smart Rental Platform</span>
        </div>

        <div className="hero-content">
          <h1>
            Rent Anything.<br />
            <span>Live Smarter.</span>
          </h1>
          <p>
            The easiest way to rent books, cameras, laptops, and equipment with flexible 1–7 day plans.
          </p>

          <div className="feature-cards-list">
            <div className="feature-mini-card">
              <div className="feature-icon">⚡</div>
              <div>
                <h4>Instant 1–7 Day Rentals</h4>
                <p>Choose exact duration with dynamic daily pricing.</p>
              </div>
            </div>

            <div className="feature-mini-card">
              <div className="feature-icon">🛡️</div>
              <div>
                <h4>Verified Inventory</h4>
                <p>All items checked for quality & damage protection.</p>
              </div>
            </div>
          </div>

          {/* SINGLE ADMIN CREDENTIALS DISPLAY */}
          <div className="admin-demo-card">
            <div className="admin-demo-header">
              <ShieldCheck size={18} />
              <span>Single Admin Account Credentials</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 8px' }}>
              System Admin login details for platform management:
            </p>
            <div className="admin-cred-row">
              <span>Email: <b>24205024@nec.edu.in</b></span>
            </div>
            <div className="admin-cred-row">
              <span>Password: <b>Moha&amp;2025#</b></span>
            </div>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                className="btn-fill-admin"
              >
                ⚡ Go to Admin Login
              </button>
            </Link>
          </div>
        </div>

        <div className="hero-footer">
          <small>© 2026 SmartRent Inc. All rights reserved.</small>
        </div>
      </div>

      {/* RIGHT SIDE FORM CONTAINER */}
      <div className="auth-right-container">
        <div className="auth-card-white">
          <div className="auth-tabs">
            <Link to="/login" className="tab-btn">Sign In</Link>
            <Link to="/signup" className="tab-btn active">Create Account</Link>
          </div>

          <div className="auth-title-section">
            <h2>Create Account</h2>
            <p>Join SmartRent to start renting items today</p>
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={change}
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={change}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={change}
                placeholder="••••••••"
                required
              />
            </div>

            <button className="btn-modern-primary" type="submit">
              Create Account
            </button>
          </form>

          <p className="auth-footer-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}