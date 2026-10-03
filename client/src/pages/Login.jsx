import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = e => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("Account not found. Please signup first.");
    if (user.email !== email) return alert("Invalid email");
    localStorage.setItem("user", JSON.stringify(user));
    navigate(user.role === "admin" ? "/admin" : "/dashboard");
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
              <span>Email: <b>sudalai1234@gmail.com</b></span>
            </div>
            <div className="admin-cred-row">
              <span>Password: <b>Admin@123</b></span>
            </div>
            <button
              type="button"
              className="btn-fill-admin"
              onClick={() => { setEmail('sudalai1234@gmail.com'); setPassword('Admin@123'); }}
            >
              ⚡ One-Click Auto-Fill Admin Login
            </button>
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
            <Link to="/login" className="tab-btn active">Sign In</Link>
            <Link to="/signup" className="tab-btn">Create Account</Link>
          </div>

          <div className="auth-title-section">
            <h2>Welcome Back</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button className="btn-modern-primary" type="submit">
              Sign In
            </button>
          </form>

          <p className="auth-footer-link">
            Don't have an account? <Link to="/signup">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}