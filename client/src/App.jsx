import React, { useEffect, useMemo, useState } from 'react';

import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  Link,
  useLocation
} from 'react-router-dom';

import {
  Search,
  Package,
  Clock3,
  IndianRupee,
  LogOut,
  ShieldCheck,
  Edit,
  Trash2,
  Check,
  Plus,
  AlertTriangle,
  FileText,
  Upload,
  Sparkles,
  User,
  Hash,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Home,
  BookOpen,
  Camera,
  Laptop,
  Smartphone,
  Headphones,
  Bell,
  X
} from 'lucide-react';

import { jsPDF } from 'jspdf';

import { api } from './api';
import { getAdminEmail, sendRentalEmail } from './email';

// GOOGLE LOGIN
import {
  GoogleOAuthProvider,
  GoogleLogin
} from '@react-oauth/google';

import { jwtDecode } from 'jwt-decode';

import './App.css';


// ============================================================
// GOOGLE CLIENT ID
// ============================================================

const GOOGLE_CLIENT_ID =
  '1040147130892-o2ku78mm60qhu42pvm4l0s1ss9ie9bos.apps.googleusercontent.com';

const RAZORPAY_KEY =
  import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_TWtdNerIsAqzSE';


// ============================================================
// HELPER - GET CURRENT USER
// ============================================================

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};


// ============================================================
// CREATE RENTAL ID
// ============================================================

const createRentalId = () =>
  `IDX${Date.now().toString(36).toUpperCase()}${Math.floor(
    100 + Math.random() * 900
  )}`;


// ============================================================
// AUTHENTICATION GUARD
// ============================================================

function Guard({ role, children }) {
  const user = getUser();
  const token = localStorage.getItem('token');

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin' && user.role !== 'admin') {
    return <Navigate to="/browse" replace />;
  }

  return children;
}


// ============================================================
// ============================================================
// REAL-TIME NOTIFICATION HOOK & TOAST SYSTEM
// ============================================================

function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [prevNotifIds, setPrevNotifIds] = useState(new Set());

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.get('/notifications/mine');
      const list = res.data.notifications || [];
      const unread = res.data.unreadCount || 0;

      // Detect brand new unread notifications to trigger floating toast
      if (prevNotifIds.size > 0) {
        const newUnread = list.filter((n) => !n.isRead && !prevNotifIds.has(n._id));
        if (newUnread.length > 0) {
          newUnread.forEach((n) => {
            setToasts((prev) => [n, ...prev.slice(0, 2)]);
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t._id !== n._id));
            }, 6000);
          });
        }
      }

      setPrevNotifIds(new Set(list.map((n) => n._id)));
      setNotifications(list);
      setUnreadCount(unread);
    } catch (err) {
      // Ignore unauth errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, [prevNotifIds]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t._id !== id));
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    notifications,
    unreadCount,
    toasts,
    removeToast,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
}

function getNotifIconInfo(type) {
  switch (type) {
    case 'rental_requested': return { cls: 'notif-icon-requested', toastCls: '', icon: '📥' };
    case 'rental_approved': return { cls: 'notif-icon-approved', toastCls: 'toast-approved', icon: '✅' };
    case 'rental_rejected': return { cls: 'notif-icon-rejected', toastCls: 'toast-rejected', icon: '❌' };
    case 'rental_returned': return { cls: 'notif-icon-returned', toastCls: 'toast-returned', icon: '📦' };
    case 'damage_reported': return { cls: 'notif-icon-damage', toastCls: 'toast-damage', icon: '⚠️' };
    default: return { cls: 'notif-icon-info', toastCls: '', icon: '🔔' };
  }
}

function formatNotifTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ============================================================
// NOTIFICATION HISTORY MODAL (FULL MONGODB AUDIT TRAIL)
// ============================================================

function NotificationHistoryModal({ notif, onClose, admin = false }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!notif) return;
    const uid = notif.uniqueId || notif.rental?.uniqueId;
    if (uid) {
      api.get(`/notifications/history/${uid}`)
        .then((res) => {
          setHistoryData(res.data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [notif]);

  if (!notif) return null;

  const rental = historyData?.rental || notif.rental || {};
  const timeline = historyData?.timeline || [];
  const meta = notif.meta || {};

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <div>
            <span className="id-badge" style={{ fontSize: '11px', padding: '3px 10px', marginBottom: '6px', display: 'inline-block' }}>
              #{notif.uniqueId || rental.uniqueId || 'SYSTEM'}
            </span>
            <h3>{notif.title}</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Logged on {new Date(notif.createdAt).toLocaleString()}
            </span>
          </div>
          <button className="btn-logout" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="history-modal-body">
          {/* RENTAL SUMMARY AUDIT BOX */}
          <div className="history-meta-box">
            <div className="history-meta-item">
              <span>Rental ID</span>
              <b>#{notif.uniqueId || rental.uniqueId || 'N/A'}</b>
            </div>
            <div className="history-meta-item">
              <span>Product</span>
              <b>{meta.productName || rental.product?.name || 'Rental Item'}</b>
            </div>
            <div className="history-meta-item">
              <span>Amount Paid</span>
              <b style={{ color: '#10b981' }}>₹{meta.amount || rental.totalAmount || 0}</b>
            </div>
            <div className="history-meta-item">
              <span>Duration</span>
              <b>{meta.days || rental.days || 1} Day(s)</b>
            </div>
            <div className="history-meta-item">
              <span>Contact Mobile</span>
              <b>{meta.customerMobile || rental.mobile || 'N/A'}</b>
            </div>
            <div className="history-meta-item">
              <span>Live Status</span>
              <b style={{ textTransform: 'uppercase', color: '#4f46e5' }}>{rental.status || meta.status || notif.type}</b>
            </div>
          </div>

          {/* TIMELINE JOURNEY STORED IN MONGODB */}
          <div className="history-timeline-section">
            <h4>
              <Clock3 size={16} /> Complete MongoDB Lifecycle History & Messages
            </h4>

            <div className="history-timeline-list">
              {timeline.length > 0 ? (
                timeline.map((item, idx) => {
                  const { cls, icon } = getNotifIconInfo(item.type);
                  return (
                    <div key={item._id || idx} className="history-timeline-item">
                      <div className={`history-timeline-dot ${cls.replace('notif-icon-', 'dot-')}`}>
                        {idx + 1}
                      </div>
                      <div className="history-timeline-title">
                        <span>{item.title}</span>
                        <span className="history-timeline-time">{new Date(item.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="history-timeline-desc">{item.message}</p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                        <span className="history-timeline-badge">{item.type.replace('_', ' ').toUpperCase()}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>&bull; {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="history-timeline-item">
                  <div className="history-timeline-dot">1</div>
                  <div className="history-timeline-title">
                    <span>{notif.title}</span>
                    <span className="history-timeline-time">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="history-timeline-desc">{notif.message}</p>
                  <span className="history-timeline-badge">{notif.type.replace('_', ' ').toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="history-modal-footer">
          <Link
            to={admin ? '/admin/requests' : '/rentals'}
            className="btn btn-green btn-sm"
            style={{ textDecoration: 'none' }}
            onClick={onClose}
          >
            {admin ? 'Go to Admin Requests & Approvals' : 'Go to My Rentals'} &rarr;
          </Link>
          <button className="btn btn-dark btn-sm" onClick={onClose}>
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationBell({ notifData, admin = false, onSelectHistory }) {
  const user = getUser();
  const location = useLocation();
  const isAdmin = Boolean(admin || user?.role === 'admin' || location.pathname.startsWith('/admin'));
  const notifUrl = isAdmin ? '/admin/notifications' : '/notifications';
  const unreadCount = notifData?.unreadCount || 0;

  return (
    <div className="notif-container">
      <Link
        to={notifUrl}
        className="notif-bell-btn"
        title="Live Notifications & Activity"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </Link>
    </div>
  );
}


// ============================================================
// GLOBAL LAYOUT
// ============================================================

function Layout({ admin = false, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isAdmin = Boolean(admin || user?.role === 'admin' || location.pathname.startsWith('/admin'));
  const homeTarget = isAdmin ? '/admin' : (user ? '/browse' : '/login');
  const notifData = useRealtimeNotifications();
  const [selectedHistoryNotif, setSelectedHistoryNotif] = useState(null);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      {/* NOTIFICATION HISTORY MODAL */}
      {selectedHistoryNotif && (
        <NotificationHistoryModal
          notif={selectedHistoryNotif}
          onClose={() => setSelectedHistoryNotif(null)}
          admin={isAdmin}
        />
      )}

      {/* FLOATING REAL-TIME TOAST NOTIFICATIONS */}
      {notifData.toasts && notifData.toasts.length > 0 && (
        <div className="toast-container">
          {notifData.toasts.map((toast) => {
            const { toastCls, icon } = getNotifIconInfo(toast.type);
            return (
              <div
                key={toast._id}
                className={`realtime-toast ${toastCls}`}
                onClick={() => setSelectedHistoryNotif(toast)}
                style={{ cursor: 'pointer' }}
              >
                <div className="toast-icon-box">{icon}</div>
                <div className="toast-content">
                  <div className="toast-title">{toast.title}</div>
                  <p className="toast-message">{toast.message}</p>
                  <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '600', marginTop: '2px', display: 'block' }}>
                    Click to view MongoDB history &rarr;
                  </span>
                </div>
                <button
                  type="button"
                  className="toast-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    notifData.removeToast(toast._id);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <header>
        <Link
          className="logo"
          to={homeTarget}
          title="SmartRent Home"
        >
          Smart<span>Rent</span>
        </Link>

        <div className="header-right">
          <Link className="home-link" to={homeTarget} title="Home">
            <Home size={16} />
            <span>Home</span>
          </Link>
          {user ? (
            <>
              <NotificationBell
                notifData={notifData}
                admin={isAdmin}
                onSelectHistory={(n) => setSelectedHistoryNotif(n)}
              />
              <div className="user-tag">
                <User size={14} />
                {user.username || user.name || user.email}
              </div>
              <button className="btn-logout" onClick={logout}>
                <LogOut size={15} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="guest-link" to="/login">Login</Link>
              <Link className="guest-signup" to="/signup">Sign Up</Link>
            </>
          )}
        </div>
      </header>

      <div className="app">

        <aside>

          <div className="aside-title">
            {isAdmin
              ? 'ADMIN DASHBOARD'
              : 'USER DASHBOARD'}
          </div>

          {isAdmin ? (
            <>
              <Link
                className={
                  location.pathname === '/admin'
                    ? 'active'
                    : ''
                }
                to="/admin"
              >
                <Sparkles size={18} />
                Dashboard
              </Link>

              <Link
                className={
                  location.pathname ===
                  '/admin/products'
                    ? 'active'
                    : ''
                }
                to="/admin/products"
              >
                <Package size={18} />
                Manage Products
              </Link>

              <Link
                className={
                  location.pathname ===
                  '/admin/requests'
                    ? 'active'
                    : ''
                }
                to="/admin/requests"
              >
                <Clock3 size={18} />
                Requests & Approvals
              </Link>

              <Link
                className={
                  location.pathname ===
                  '/admin/notifications'
                    ? 'active'
                    : ''
                }
                to="/admin/notifications"
              >
                <Bell size={18} />
                Live Notifications
                {notifData.unreadCount > 0 && (
                  <span className="sidebar-pill-badge">{notifData.unreadCount}</span>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link
                className={
                  location.pathname === '/browse'
                    ? 'active'
                    : ''
                }
                to="/browse"
              >
                <Package size={18} />
                Browse Products
              </Link>

              <Link
                className={
                  location.pathname === '/rentals'
                    ? 'active'
                    : ''
                }
                to="/rentals"
              >
                <Clock3 size={18} />
                My Rentals
              </Link>

              <Link
                className={
                  location.pathname ===
                  '/notifications'
                    ? 'active'
                    : ''
                }
                to="/notifications"
              >
                <Bell size={18} />
                Live Notifications
                {notifData.unreadCount > 0 && (
                  <span className="sidebar-pill-badge">{notifData.unreadCount}</span>
                )}
              </Link>
            </>
          )}

          <small>
            <ShieldCheck
              size={16}
              color="#10b981"
            />
            Verified Secure Rental
          </small>

        </aside>

        <main>
          {children}
        </main>

      </div>
    </>
  );
}


// ============================================================
// AUTHENTICATION PAGE
// LOGIN + SIGNUP + GOOGLE LOGIN
// ============================================================

function Auth({ signup = false }) {

  const navigate = useNavigate();

  const [f, setF] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  const [err, setErr] = useState('');

  const [googleLoading, setGoogleLoading] =
    useState(false);


  // ==========================================================
  // NORMAL EMAIL/PASSWORD LOGIN OR SIGNUP
  // ==========================================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setErr('');

    try {

      const response = await api.post(
        `/auth/${signup ? 'signup' : 'login'}`,
        f
      );

      localStorage.setItem(
        'token',
        response.data.token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(response.data.user)
      );

      if (
        response.data.user.role === 'admin'
      ) {
        navigate('/admin');
      } else {
        navigate('/browse');
      }

    } catch (error) {

      console.error(
        'Authentication Error:',
        error
      );

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setErr(
        error.response?.data?.message ||
        (
          error.response
            ? 'Invalid email or password'
            : 'Server unavailable. Please try again.'
        )
      );
    }
  };


  // ==========================================================
  // GOOGLE LOGIN
  // ==========================================================

  const handleGoogleSuccess = async (
    credentialResponse
  ) => {

    setErr('');
    setGoogleLoading(true);

    try {

      // Google returns a JWT credential.
      const credential =
        credentialResponse?.credential;

      if (!credential) {

        setErr(
          'Google did not return a login credential.'
        );

        return;
      }


      // Decode Google JWT
      const decoded =
        jwtDecode(credential);


      console.log(
        'Google User:',
        decoded
      );


      // Send Google credential to backend
      const response = await api.post(
        '/auth/google',
        {
          credential: credential,

          googleId: decoded.sub,

          email: decoded.email,

          username:
            decoded.name ||
            decoded.email?.split('@')[0],

          picture:
            decoded.picture || ''
        }
      );


      // Make sure backend returned required data
      if (
        !response.data?.token ||
        !response.data?.user
      ) {

        throw new Error(
          'Invalid response from server.'
        );
      }


      // Store application JWT
      localStorage.setItem(
        'token',
        response.data.token
      );


      // Store application user
      localStorage.setItem(
        'user',
        JSON.stringify(response.data.user)
      );


      console.log(
        'SmartRent Google Login Successful'
      );


      // Google users should normally be customers.
      if (
        response.data.user.role === 'admin'
      ) {
        navigate('/admin');
      } else {
        navigate('/browse');
      }

    } catch (error) {

      console.error(
        'Google Login Error:',
        error
      );

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setErr(
        error.response?.data?.message ||
        error.message ||
        'Google login failed. Please try again.'
      );

    } finally {

      setGoogleLoading(false);

    }
  };


  // ==========================================================
  // GOOGLE LOGIN ERROR
  // ==========================================================

  const handleGoogleError = () => {

    console.error(
      'Google Login Failed'
    );

    setErr(
      'Google Login Failed. Please try again.'
    );
  };


  return (
    <div className="auth-modern-page">
      {/* LEFT SIDE: Hero & Branding (White/Light Theme) */}
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
              onClick={() => setF({ ...f, email: 'sudalai1234@gmail.com', password: 'Admin@123' })}
            >
              ⚡ One-Click Auto-Fill Admin Login
            </button>
          </div>
        </div>

        <div className="hero-footer">
          <small>© 2026 SmartRent Inc. All rights reserved.</small>
        </div>
      </div>

      {/* RIGHT SIDE: White Form Container */}
      <div className="auth-right-container">
        <div className="auth-card-white">
          {/* Header & Toggle */}
          <div className="auth-header-toggle">
            <div className="auth-tabs">
              <Link to="/login" className={`tab-btn ${!signup ? 'active' : ''}`}>
                Sign In
              </Link>
              <Link to="/signup" className={`tab-btn ${signup ? 'active' : ''}`}>
                Create Account
              </Link>
            </div>
          </div>

          <div className="auth-title-section">
            <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
            <p>{signup ? 'Join SmartRent to start renting items today' : 'Enter your credentials to access your account'}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {signup && (
              <div className="form-group">
                <label>Username</label>
                <input
                  value={f.username}
                  onChange={(e) => setF({ ...f, username: e.target.value })}
                  required
                  placeholder="e.g. John Doe"
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                required
                placeholder="name@example.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>

            {err && (
              <div className="error-alert-white">
                <AlertTriangle size={16} />
                <span>{err}</span>
              </div>
            )}

            <button className="btn-modern-primary" type="submit" disabled={googleLoading}>
              {signup ? 'Create Account' : 'Sign In'}
            </button>

            <div className="divider-line">
              <span>OR</span>
            </div>

            <div className="google-btn-wrapper">
              {googleLoading ? (
                <div className="google-loading-text">Signing in with Google...</div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text={signup ? 'signup_with' : 'signin_with'}
                  shape="rectangular"
                  width="360"
                />
              )}
            </div>
          </form>

          <p className="auth-footer-link">
            {signup ? 'Already registered? ' : 'New to SmartRent? '}
            <Link to={signup ? '/login' : '/signup'}>
              {signup ? 'Sign In' : 'Create Account'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}



// ============================================================
// USER - BROWSE PRODUCTS
// ============================================================

function Browse() {

  const [products, setProducts] =
    useState([]);

  const [query, setQuery] =
    useState('');

  const [selectedCat, setSelectedCat] =
    useState('All');


  useEffect(() => {

    api
      .get('/products')
      .then((response) =>
        setProducts(response.data)
      )
      .catch((error) =>
        console.error(
          'Products Error:',
          error
        )
      );

  }, []);


  const categories = useMemo(() => {

    const list = Array.from(
      new Set(
        products
          .map((p) => p.category)
          .filter(Boolean)
      )
    );

    return ['All', ...list];

  }, [products]);


  const shown = useMemo(() => {

    return products.filter((x) =>

      (
        selectedCat === 'All' ||
        x.category === selectedCat
      )

      &&

      x.name
        .toLowerCase()
        .includes(
          query.toLowerCase()
        )

    );

  }, [
    products,
    query,
    selectedCat
  ]);


  return (

    <Layout>

      <section className="hero">

        <small>
          COLLEGE ESSENTIALS ON RENT
        </small>

        <h1>
          Get What You Need,
          <br />
          <span>
            Only For the Time You Need
          </span>
        </h1>

        <p>
          Rent laptops, cameras, books, mobiles and more —
          affordable, flexible and hassle-free.
        </p>

        <button className="btn hero-action" onClick={() => document.querySelector('.browse-products')?.scrollIntoView({ behavior: 'smooth' })}>
          Browse Products <ArrowRight size={17} />
        </button>

      </section>


      <section className="category-showcase">
        <div className="showcase-heading">
          <div>
            <small>SHOP BY CATEGORY</small>
            <h2>Explore Our Rental Categories</h2>
          </div>
          <button className="text-action" onClick={() => setSelectedCat('All')}>View All <ArrowRight size={15} /></button>
        </div>

        <div className="category-tiles">
          {[
            ['Books', BookOpen, 'Textbooks, reference books and more', 'linear-gradient(135deg, #245bc3, #173267)'],
            ['Cameras', Camera, 'Capture your moments perfectly', 'linear-gradient(135deg, #126b71, #12374c)'],
            ['Laptops', Laptop, 'Power your ideas anywhere', 'linear-gradient(135deg, #56429c, #27285d)'],
            ['Mobiles', Smartphone, 'Stay connected always', 'linear-gradient(135deg, #76377e, #3d205b)']
          ].map(([name, Icon, description, background]) => (
            <button className="category-tile" key={name} style={{ background }} onClick={() => setSelectedCat(name)}>
              <span className="category-icon"><Icon size={21} /></span>
              <strong>{name}</strong>
              <span>{description}</span>
              <i><ArrowRight size={16} /></i>
            </button>
          ))}
        </div>
      </section>


      <div className="stats">

        <div className="stat">

          <div className="stat-icon">
            <Package size={24} />
          </div>

          <div>
            <span>
              Available Inventory
            </span>

            <b>
              {products.length} Items
            </b>
          </div>

        </div>


        <div className="stat">

          <div className="stat-icon">
            <Clock3 size={24} />
          </div>

          <div>
            <span>
              Flexible Rentals
            </span>

            <b>
              1 – 7 Days
            </b>
          </div>

        </div>


        <div className="stat">

          <div className="stat-icon">
            <IndianRupee size={24} />
          </div>

          <div>
            <span>
              Rental Pricing
            </span>

            <b>
              From ₹30/day
            </b>
          </div>

        </div>

      </div>


      <section className="browse-products">
      <div className="showcase-heading product-heading">
        <div>
          <small>POPULAR RENTALS</small>
          <h2>Top Picks for You</h2>
        </div>
        <button className="text-action" onClick={() => setSelectedCat('All')}>View All <ArrowRight size={15} /></button>
      </div>

      <div className="toolbar">

        <div className="search">

          <Search size={18} />

          <input
            placeholder="Search products by title or keywords..."
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
          />

        </div>


      </div>


      <div className="grid">

        {shown.map((p) => (

          <article
            className="card"
            key={p._id}
          >

            <div className="card-img-wrapper">

              <img
                src={
                  p.image ||
                  'https://images.unsplash.com/photo-1544947950-fa07a98d237f'
                }
                alt={p.name}
              />

              <span className="badge-category">
                {p.category}
              </span>

              <span className="badge-count">
                Stock: {p.productCount || 1}
              </span>

            </div>


            <div className="card-content">

              <h3>
                {p.name}
              </h3>

              <div className="card-price">
                ₹{p.pricePerDay}
                <span>
                  / day
                </span>
              </div>


              <div className="days-chips">

                {[1, 2, 3, 4, 5, 6, 7].map(
                  (d) => (
                    <i key={d}>
                      {d}d
                    </i>
                  )
                )}

              </div>


              <Link
                className="btn full"
                to={`/product/${p._id}`}
              >
                View Details & Rent
              </Link>

            </div>

          </article>

        ))}


        {!shown.length && (

          <div
            className="black-fitted-card full-width"
            style={{
              justifyContent: 'center',
              padding: '40px'
            }}
          >

            <p
              style={{
                color:
                  'var(--text-muted)'
              }}
            >
              No products found
              matching your search
              criteria.
            </p>

          </div>

        )}

      </div>

      </section>

    </Layout>
  );
}


// ============================================================
// PRODUCT DETAILS
// ============================================================

function ProductDetails() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [p, setP] =
    useState(null);


  useEffect(() => {

    api
      .get('/products/' + id)
      .then((response) =>
        setP(response.data)
      )
      .catch((error) =>
        console.error(
          'Product Error:',
          error
        )
      );

  }, [id]);


  if (!p) {
    return (
      <Layout>
        Loading product details...
      </Layout>
    );
  }


  return (

    <Layout>

      <div className="detail-navigation">
        <button className="back-link" onClick={() => navigate(-1)} title="Go back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <Link className="home-link detail-home-link" to="/browse" title="Home">
          <Home size={16} />
          <span>Home</span>
        </Link>
      </div>

      <div className="detail-card">

        <img
          src={
            p.image ||
            'https://images.unsplash.com/photo-1544947950-fa07a98d237f'
          }
          alt={p.name}
        />


        <div className="detail-info">

          <span
            className="badge-category"
            style={{
              position: 'relative',
              top: 0,
              width: 'fit-content'
            }}
          >
            {p.category}
          </span>


          <h1>
            {p.name}
          </h1>


          <p
            style={{
              color:
                'var(--text-muted)',
              lineHeight: '1.6'
            }}
          >
            {p.description ||
              'No specific description provided.'}
          </p>


          <div className="price-tag">
            ₹{p.pricePerDay}
            <small>
              / day
            </small>
          </div>


          <div
            style={{
              background:
                'var(--bg-input)',
              padding: '14px',
              borderRadius: '12px',
              border:
                '1px solid var(--border-color)'
            }}
          >

            <p
              style={{
                fontSize: '13px',
                color:
                  'var(--text-sub)'
              }}
            >
              Product Inventory Count:
              <b>
                {p.productCount || 1}
                {' '}available
              </b>
            </p>


            {p.availableFrom &&
              p.availableTo && (

                <p
                  style={{
                    fontSize: '13px',
                    color:
                      'var(--text-sub)',
                    marginTop: '4px'
                  }}
                >
                  Rental Window:
                  <b>
                    {' '}
                    {new Date(
                      p.availableFrom
                    ).toLocaleDateString()}
                    {' – '}
                    {new Date(
                      p.availableTo
                    ).toLocaleDateString()}
                  </b>
                </p>

              )}

          </div>


          <div
            className="days-chips"
            style={{
              marginTop: '10px'
            }}
          >

            {[1, 2, 3, 4, 5, 6, 7].map(
              (d) => (

                <i
                  key={d}
                  style={{
                    padding:
                      '8px 12px',
                    fontSize: '13px'
                  }}
                >
                  {d}
                  {' '}
                  Day{d > 1 ? 's' : ''}
                </i>

              )
            )}

          </div>


          <button
            className="btn full"
            style={{
              marginTop: 'auto'
            }}
            onClick={() =>
              navigate(
                '/payment/' + p._id
              )
            }
          >
            Continue to Rental Request
            & Payment
          </button>

        </div>

      </div>

    </Layout>
  );
}


// ============================================================
// PAYMENT + RENTAL REQUEST
// ============================================================

function Payment() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [uniqueId] =
    useState(createRentalId);

  const [p, setP] =
    useState(null);

  const [days, setDays] =
    useState(1);

  const [mobile, setMobile] =
    useState('');

  const [isProcessing, setIsProcessing] =
    useState(false);


  useEffect(() => {

    api
      .get('/products/' + id)
      .then((response) =>
        setP(response.data)
      );

  }, [id]);


  const total = useMemo(
    () =>
      (p?.pricePerDay || 0) *
      days,
    [p, days]
  );


  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };


  const submitRequest =
    async () => {

      if (
        !/^[6-9]\d{9}$/.test(mobile)
      ) {

        return alert(
          'Please enter a valid 10-digit mobile number'
        );

      }

      const startDate =
        new Date();

      const endDate =
        new Date();

      endDate.setDate(
        startDate.getDate() +
        days
      );


      try {

        const response =
          await api.post(
            '/rentals',
            {
              product: id,
              days,
              mobile,
              upiId: '',
              startDate,
              endDate,
              uniqueId
            }
          );


        const submittedId =
          response.data.uniqueId ||
          uniqueId;


        await sendRentalEmail({

          recipientEmail:
            getAdminEmail(),

          recipientName:
            'SmartRent Admin',

          subject:
            `New rental request: ${submittedId}`,

          status: 'pending',

          rental: {
            ...response.data,
            product: p
          }

        });


        alert(
          `Rental request submitted successfully with ID: ${submittedId}`
        );


        navigate('/rentals');

      } catch (error) {

        console.error(
          'Rental Error:',
          error
        );

        alert(
          error.response?.data?.message ||
          'Rental request failed.'
        );

      }
    };


  const handleRazorpayPayment =
    async () => {

      if (
        !/^[6-9]\d{9}$/.test(mobile)
      ) {

        return alert(
          'Please enter a valid 10-digit mobile number'
        );

      }

      if (!p) return;

      try {
        setIsProcessing(true);

        const razorpayLoaded =
          await loadRazorpay();

        if (!razorpayLoaded) {
          alert(
            'Razorpay SDK failed to load'
          );
          return;
        }

        const orderResponse =
          await api.post(
            '/payment/create-order',
            { amount: total }
          );

        const order =
          orderResponse.data.order;

        const userData =
          getUser() || {};

        const razorpay = new window.Razorpay({
          key: RAZORPAY_KEY,
          amount: order.amount,
          currency: order.currency,
          name: 'SmartRent',
          description: `Rental for ${p.name}`,
          order_id: order.id,
          handler: async function (paymentResponse) {
            console.log(
              'Razorpay Success:',
              paymentResponse
            );
            await submitRequest();
            setIsProcessing(false);
          },
          prefill: {
            name:
              userData.username ||
              userData.name ||
              'SmartRent User',
            email:
              userData.email ||
              'user@example.com',
            contact: mobile,
          },
          theme: {
            color: '#3399cc'
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            }
          }
        });

        razorpay.open();
      } catch (error) {
        console.error(
          'Razorpay Error:',
          error
        );
        setIsProcessing(false);
        alert(
          error.response?.data?.message ||
          'Unable to create payment order'
        );
      }
    };


  if (!p) {

    return (
      <Layout>
        Loading payment form...
      </Layout>
    );

  }


  return (

    <Layout>

      <div
        style={{
          maxWidth: '650px',
          margin: '0 auto'
        }}
      >

        <div className="pay-card">

          <div
            className="id-badge"
            style={{
              width: 'fit-content'
            }}
          >
            <Hash size={14} />

            Assigned Rental ID:
            {' '}
            {uniqueId}
          </div>


          <h2
            style={{
              fontFamily: 'Outfit',
              fontSize: '28px'
            }}
          >
            Payment & Rental Request
          </h2>


          <p
            style={{
              color:
                'var(--text-muted)'
            }}
          >
            {p.name}
            {' • '}
            ₹{p.pricePerDay}/day
          </p>


          <label>
            Select Rental Duration
            (Days)
          </label>


          <select
            value={days}
            onChange={(e) =>
              setDays(+e.target.value)
            }
          >

            {[1, 2, 3, 4, 5, 6, 7].map(
              (d) => (

                <option
                  key={d}
                  value={d}
                >
                  {d}
                  {' '}
                  Day{d > 1 ? 's' : ''}
                  {' '}
                  (Total: ₹
                  {p.pricePerDay * d})
                </option>

              )
            )}

          </select>


          <label>
            Mobile Number
            (For Verification & Delivery)
          </label>


          <input
            maxLength="10"
            value={mobile}
            onChange={(e) =>
              setMobile(
                e.target.value.replace(
                  /\D/g,
                  ''
                )
              )
            }
            placeholder="Enter 10-digit mobile number"
          />


          <div
            style={{
              background: '#0d0f17',
              padding: '18px',
              borderRadius: '12px',
              border:
                '1px solid var(--border-color)',
              marginTop: '8px'
            }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center'
              }}
            >

              <span
                style={{
                  color:
                    'var(--text-muted)'
                }}
              >
                Total Rental Amount:
              </span>

              <span
                style={{
                  fontSize: '26px',
                  fontFamily: 'Outfit',
                  fontWeight: '800',
                  color:
                    'var(--accent-indigo)'
                }}
              >
                ₹{total}
              </span>

            </div>


            <small
              style={{
                color:
                  'var(--text-sub)',
                display: 'block',
                marginTop: '6px'
              }}
            >
              Demo payment simulation.
              Rental request will be
              sent to Admin for approval.
            </small>

          </div>


          <button
            className="btn full btn-green"
            onClick={handleRazorpayPayment}
            disabled={isProcessing}
            style={{
              marginTop: '10px'
            }}
          >
            {isProcessing
              ? 'Processing Razorpay...'
              : 'Pay Now & Send Request to Admin'}
          </button>

        </div>

      </div>

    </Layout>
  );
}


// ============================================================
// MY RENTALS
// ============================================================

function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [billRental, setBillRental] = useState(null);

  const loadRentals = () => {
    api
      .get('/rentals/mine')
      .then((response) => setRentals(response.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadRentals();
    const interval = setInterval(loadRentals, 4000);
    return () => clearInterval(interval);
  }, []);

  const exportRentalBillPDF = (rental) => {
    const doc = new jsPDF();
    const invNo = `INV-2026-${rental.uniqueId || 'IDX3251'}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SMARTRENT - OFFICIAL RENTAL BILL', 15, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Smart Equipment Rentals & Management System', 15, 33);
    doc.text(`Invoice No: ${invNo}`, 135, 33);

    let y = 60;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO (CUSTOMER DETAILS):', 15, y);
    doc.text('RENTAL SUMMARY:', 120, y);

    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rental ID: ${rental.uniqueId || 'IDX3251'}`, 120, y);

    y += 6;
    doc.text(`Mobile: ${rental.mobile || 'N/A'}`, 15, y);
    doc.text(`Rental Duration: ${rental.days} Days`, 120, y);

    y += 6;
    doc.text(`Start Date: ${new Date(rental.startDate).toLocaleDateString()}`, 120, y);
    doc.text(`Status: COMPLETED & RETURNED`, 15, y);

    y += 6;
    doc.text(`End Date: ${new Date(rental.endDate).toLocaleDateString()}`, 120, y);

    y += 12;
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, 195, y);

    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('ITEM DESCRIPTION', 20, y + 7);
    doc.text('CATEGORY', 95, y + 7);
    doc.text('DURATION', 135, y + 7);
    doc.text('TOTAL AMOUNT (Rs.)', 160, y + 7);

    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.text(`${rental.product?.name || 'Rental Item'}`, 20, y);
    doc.text(`${rental.product?.category || 'General'}`, 95, y);
    doc.text(`${rental.days} Days`, 135, y);
    doc.text(`Rs. ${rental.totalAmount || 0}`, 160, y);

    if (rental.damageReport?.isDamaged) {
      y += 10;
      doc.setTextColor(220, 38, 38);
      doc.text(`Damage Fine Penalty (${rental.damageReport.damageDetails || 'Item Damage'})`, 20, y);
      doc.text(`+ Rs. ${rental.damageReport.damageCost || 0}`, 160, y);
      doc.setTextColor(30, 41, 59);
    }

    y += 20;
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);

    y += 12;
    const damageCost = rental.damageReport?.isDamaged ? (rental.damageReport.damageCost || 0) : 0;
    const grandTotal = (rental.totalAmount || 0) + damageCost;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL AMOUNT PAID:', 110, y);
    doc.setTextColor(79, 70, 229);
    doc.text(`Rs. ${grandTotal}`, 165, y);

    y += 40;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for renting with SmartRent!', 15, y);

    doc.save(`Rental_Bill_${rental.uniqueId || 'IDX3251'}.pdf`);
  };

  return (
    <Layout>
      <div className="page-title-box">
        <div>
          <h1>My Rental Requests</h1>
          <p>
            Track real-time request approvals, live rental status, and billing invoices.
          </p>
        </div>
      </div>

      {rentals.map((x) => (
        <div className="black-fitted-card" key={x._id}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="id-badge" style={{ fontSize: '11px', padding: '3px 10px' }}>
                {x.uniqueId || 'IDX3251'}
              </span>
              <b style={{ fontSize: '17px', color: 'var(--text-main)' }}>
                {x.product?.name}
              </b>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
              {x.days} Days • Total: ₹{x.totalAmount} • Mobile: {x.mobile || 'N/A'}
            </p>

            {x.startDate && x.endDate && (
              <p style={{ color: 'var(--text-sub)', fontSize: '12px', marginTop: '4px' }}>
                Dates: {new Date(x.startDate).toLocaleDateString()} to {new Date(x.endDate).toLocaleDateString()}
              </p>
            )}

            {/* REAL-TIME LIFECYCLE MONITORING */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800 }}>STAGE:</span>
              <span className="status-pill" style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                1. REQUESTED
              </span>
              <span style={{ color: '#475569', fontSize: '10px' }}>➔</span>
              <span className="status-pill" style={{ fontSize: '10px', padding: '2px 8px', background: (x.status === 'approved' || x.status === 'returned') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: (x.status === 'approved' || x.status === 'returned') ? '#10b981' : '#64748b', border: `1px solid ${(x.status === 'approved' || x.status === 'returned') ? 'rgba(16, 185, 129, 0.4)' : '#2d354e'}` }}>
                2. {x.status === 'rejected' ? 'DECLINED' : 'APPROVED & ACTIVE'}
              </span>
              <span style={{ color: '#475569', fontSize: '10px' }}>➔</span>
              <span className="status-pill" style={{ fontSize: '10px', padding: '2px 8px', background: x.status === 'returned' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: x.status === 'returned' ? '#10b981' : '#64748b', border: `1px solid ${x.status === 'returned' ? 'rgba(16, 185, 129, 0.4)' : '#2d354e'}` }}>
                3. RETURNED
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`status-pill status-${x.status}`}>
              {x.status}
            </span>

            {x.status === 'returned' && (
              <button
                className="btn btn-green btn-sm"
                onClick={() => exportRentalBillPDF(x)}
              >
                <FileText size={15} /> Download PDF Bill
              </button>
            )}
          </div>
        </div>
      ))}

      {!rentals.length && (
        <div className="black-fitted-card" style={{ justifyContent: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            You have no active rental requests yet.
          </p>
        </div>
      )}
    </Layout>
  );
}


// ============================================================
// ADMIN DASHBOARD
// ============================================================

function AdminDashboard() {

  const [products, setProducts] =
    useState([]);

  const [rentals, setRentals] =
    useState([]);


  useEffect(() => {

    Promise.all([
      api.get('/products'),
      api.get('/rentals')
    ]).then(
      ([productsResponse,
        rentalsResponse]) => {

        setProducts(
          productsResponse.data
        );

        setRentals(
          rentalsResponse.data
        );

      }
    );

  }, []);


  const pendingCount =
    useMemo(
      () =>
        rentals.filter(
          (x) =>
            x.status === 'pending'
        ).length,
      [rentals]
    );


  const approvedCount =
    useMemo(
      () =>
        rentals.filter(
          (x) =>
            x.status === 'approved'
        ).length,
      [rentals]
    );


  const damagedCount =
    useMemo(
      () =>
        rentals.filter(
          (x) =>
            x.damageReport?.isDamaged
        ).length,
      [rentals]
    );


  const totalRevenue =
    useMemo(
      () =>
        rentals.reduce(
          (sum, x) =>
            sum +
            (x.totalAmount || 0),
          0
        ),
      [rentals]
    );


  const totalProductCount =
    useMemo(
      () =>
        products.reduce(
          (sum, x) =>
            sum +
            (x.productCount || 1),
          0
        ),
      [products]
    );


  return (

    <Layout admin>

      <div className="hero">

        <small>
          ADMIN CONTROL CENTER
        </small>

        <h1>
          SmartRent Dashboard
        </h1>

        <p>
          Real-time inventory dynamic
          tracking, rental request
          management, and damage reports.
        </p>

      </div>


      <div className="stats">

        <div className="stat">

          <div className="stat-icon">
            <Package size={24} />
          </div>

          <div>
            <span>
              Products / Inventory
            </span>

            <b>
              {products.length}
              {' '}
              ({totalProductCount}
              {' '}Units)
            </b>
          </div>

        </div>


        <div className="stat">

          <div className="stat-icon">
            <Clock3 size={24} />
          </div>

          <div>
            <span>
              Pending Approvals
            </span>

            <b>
              {pendingCount}
              {' '}Requests
            </b>
          </div>

        </div>


        <div className="stat">

          <div className="stat-icon">
            <Check size={24} />
          </div>

          <div>
            <span>
              Approved Rentals
            </span>

            <b>
              {approvedCount}
              {' '}Items
            </b>
          </div>

        </div>


        <div className="stat">

          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>

          <div>
            <span>
              Reported Damaged
            </span>

            <b>
              {damagedCount}
              {' '}Items
            </b>
          </div>

        </div>


        <div className="stat">

          <div className="stat-icon">
            <IndianRupee size={24} />
          </div>

          <div>
            <span>
              Total Revenue
            </span>

            <b>
              ₹{totalRevenue}
            </b>
          </div>

        </div>

      </div>


      <div
        style={{
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          marginTop: '20px'
        }}
      >

        <Link
          className="btn btn-green"
          to="/admin/products"
        >
          <Plus size={18} />
          Manage Products
        </Link>


        <Link
          className="btn btn-dark"
          to="/admin/requests"
        >
          <Clock3 size={18} />
          View Rental Requests
        </Link>

      </div>

    </Layout>
  );
}


// ============================================================
// ADMIN - MANAGE PRODUCTS
// ============================================================

function ManageProducts() {

  const [products, setProducts] =
    useState([]);

  const [editId, setEditId] =
    useState(null);


  const [form, setForm] =
    useState({
      name: '',
      category: '',
      productCount: 1,
      description: '',
      pricePerDay: 50,
      image: '',
      availableFrom: '',
      availableTo: ''
    });


  const loadProducts = () => {

    api
      .get('/products')
      .then((response) =>
        setProducts(response.data)
      );

  };


  useEffect(() => {

    loadProducts();

  }, []);


  const handleImageUpload =
    (e) => {

      const file =
        e.target.files[0];

      if (!file) return;


      const reader =
        new FileReader();


      reader.onloadend = () => {

        setForm((previous) => ({
          ...previous,
          image:
            reader.result
        }));

      };


      reader.readAsDataURL(file);

    };


  const saveProduct =
    async (e) => {

      e.preventDefault();


      if (!form.category.trim()) {

        return alert(
          'Please enter a category name'
        );

      }


      const payload = {

        ...form,

        image:
          form.image ||
          'https://images.unsplash.com/photo-1544947950-fa07a98d237f'

      };


      try {

        if (editId) {

          await api.put(
            '/products/' + editId,
            payload
          );

        } else {

          await api.post(
            '/products',
            payload
          );

        }


        setEditId(null);


        setForm({
          name: '',
          category: '',
          productCount: 1,
          description: '',
          pricePerDay: 50,
          image: '',
          availableFrom: '',
          availableTo: ''
        });


        loadProducts();

      } catch (error) {

        alert(
          error.response?.data?.message ||
          'Unable to save product.'
        );

      }

    };


  const startEdit =
    (p) => {

      setEditId(p._id);


      setForm({

        name: p.name || '',

        category:
          p.category || '',

        productCount:
          p.productCount || 1,

        description:
          p.description || '',

        pricePerDay:
          p.pricePerDay || 50,

        image:
          p.image || '',

        availableFrom:
          p.availableFrom
            ? p.availableFrom.slice(
                0,
                10
              )
            : '',

        availableTo:
          p.availableTo
            ? p.availableTo.slice(
                0,
                10
              )
            : ''

      });

    };


  const deleteProduct =
    async (id) => {

      if (
        window.confirm(
          'Are you sure you want to delete this product?'
        )
      ) {

        try {

          await api.delete(
            '/products/' + id
          );

          loadProducts();

        } catch (error) {

          alert(
            error.response?.data?.message ||
            'Unable to delete product.'
          );

        }

      }

    };


  return (

    <Layout admin>

      <div className="page-title-box">

        <div>

          <h1>
            Product Management
          </h1>

          <p>
            Create, Edit, Update, and
            Delete products.
          </p>

        </div>

      </div>


      <form
        className="admin-form-grid"
        onSubmit={saveProduct}
      >

        <div>

          <label>
            Product Name
          </label>

          <input
            placeholder="e.g. Sony Alpha A7 III Camera"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value
              })
            }
            required
          />

        </div>


        <div>

          <label>
            Category
          </label>

          <input
            placeholder="e.g. Photography, Electronics, Tools..."
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category:
                  e.target.value
              })
            }
            required
          />

        </div>


        <div>

          <label>
            Product Inventory Count
          </label>

          <input
            type="number"
            min="1"
            value={form.productCount}
            onChange={(e) =>
              setForm({
                ...form,
                productCount:
                  +e.target.value
              })
            }
            required
          />

        </div>


        <div>

          <label>
            Rental Price Per Day (₹)
          </label>

          <input
            type="number"
            value={form.pricePerDay}
            onChange={(e) =>
              setForm({
                ...form,
                pricePerDay:
                  +e.target.value
              })
            }
            required
          />

        </div>


        <div>

          <label>
            Rental Start Date
          </label>

          <input
            type="date"
            value={
              form.availableFrom
            }
            onChange={(e) =>
              setForm({
                ...form,
                availableFrom:
                  e.target.value
              })
            }
          />

        </div>


        <div>

          <label>
            Rental End Date
          </label>

          <input
            type="date"
            value={
              form.availableTo
            }
            onChange={(e) =>
              setForm({
                ...form,
                availableTo:
                  e.target.value
              })
            }
          />

        </div>


        <div className="image-upload-box">

          <Upload size={24} />

          <p
            style={{
              fontSize: '13px',
              color:
                'var(--text-muted)'
            }}
          >
            Upload Product Image
          </p>

          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={
              handleImageUpload
            }
            style={{
              display: 'none'
            }}
            id="file-upload-input"
          />

          <button
            type="button"
            className="btn btn-dark btn-sm"
            onClick={() =>
              document
                .getElementById(
                  'file-upload-input'
                )
                .click()
            }
          >
            Choose Image File
          </button>


          {form.image && (

            <img
              src={form.image}
              alt="Preview"
              className="image-preview"
            />

          )}

        </div>


        <div className="full-width">

          <label>
            Product Details &
            Description
          </label>

          <textarea
            rows="3"
            placeholder="Provide details about condition, specifications, and rental instructions..."
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value
              })
            }
          />

        </div>


        <div
          className="full-width"
          style={{
            display: 'flex',
            gap: '10px'
          }}
        >

          <button
            className="btn btn-green full"
          >
            {editId
              ? 'Update Product'
              : 'Create Product'}
          </button>


          {editId && (

            <button
              type="button"
              className="btn btn-dark"
              onClick={() => {

                setEditId(null);

                setForm({
                  name: '',
                  category: '',
                  productCount: 1,
                  description: '',
                  pricePerDay: 50,
                  image: '',
                  availableFrom: '',
                  availableTo: ''
                });

              }}
            >
              Cancel Edit
            </button>

          )}

        </div>

      </form>


      <h3
        style={{
          fontFamily: 'Outfit',
          marginBottom: '16px'
        }}
      >
        Existing Product Inventory
        {' '}
        ({products.length})
      </h3>


      {products.map((x) => (
        <div className="black-fitted-card" key={x._id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src={x.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f'}
              alt={x.name}
              style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <b style={{ fontSize: '17px', color: 'var(--text-main)' }}>{x.name}</b>
                <span
                  className={`status-pill status-${x.status === 'available' ? 'approved' : x.status === 'rented' ? 'pending' : 'rejected'}`}
                  style={{ fontSize: '10px', padding: '3px 8px' }}
                >
                  STATUS: {x.status?.toUpperCase() || 'AVAILABLE'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Category: <b>{x.category}</b> • Count: <b>{x.productCount || 1}</b> • ₹{x.pricePerDay}/day
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={x.status || 'available'}
              onChange={async (e) => {
                try {
                  await api.put('/products/' + x._id, { status: e.target.value });
                  loadProducts();
                } catch (err) {
                  alert(err.response?.data?.message || 'Unable to update status');
                }
              }}
              style={{ padding: '7px 10px', fontSize: '12px', borderRadius: '8px', width: 'auto', background: '#151926', color: '#fff', border: '1px solid var(--border-light)', cursor: 'pointer' }}
            >
              <option value="available">Status: Available</option>
              <option value="rented">Status: Rented Out</option>
              <option value="inactive">Status: Maintenance/Inactive</option>
            </select>

            <button className="btn btn-dark btn-sm" onClick={() => startEdit(x)}>
              <Edit size={16} /> Edit
            </button>

            <button className="btn btn-red btn-sm" onClick={() => deleteProduct(x._id)}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      ))}

    </Layout>
  );
}


// ============================================================
// ADMIN - RENTAL REQUESTS
// ============================================================

function RentalRequests() {
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [editRental, setEditRental] = useState(null);
  const [damageRental, setDamageRental] = useState(null);
  const [billRental, setBillRental] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const actionSuccess = searchParams.get('actionSuccess');
  const actionUniqueId = searchParams.get('uniqueId') || searchParams.get('id');

  const exportRentalBillPDF = (rental) => {
    const doc = new jsPDF();
    const invNo = `INV-2026-${rental.uniqueId || 'IDX3251'}`;

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SMARTRENT - OFFICIAL RENTAL BILL', 15, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Smart Equipment Rentals & Management System', 15, 33);
    doc.text(`Invoice No: ${invNo}`, 135, 33);

    // Customer & Rental Details Box
    let y = 60;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO (CUSTOMER DETAILS):', 15, y);
    doc.text('RENTAL SUMMARY:', 120, y);

    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${rental.user?.username || 'Customer'}`, 15, y);
    doc.text(`Rental ID: ${rental.uniqueId || 'IDX3251'}`, 120, y);

    y += 6;
    doc.text(`Email: ${rental.user?.email || 'N/A'}`, 15, y);
    doc.text(`Rental Duration: ${rental.days} Days`, 120, y);

    y += 6;
    doc.text(`Mobile: ${rental.mobile || 'N/A'}`, 15, y);
    doc.text(`Start Date: ${new Date(rental.startDate).toLocaleDateString()}`, 120, y);

    y += 6;
    doc.text(`Status: COMPLETED & RETURNED`, 15, y);
    doc.text(`End Date: ${new Date(rental.endDate).toLocaleDateString()}`, 120, y);

    // Line separator
    y += 12;
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, 195, y);

    // Items Table Header
    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('ITEM DESCRIPTION', 20, y + 7);
    doc.text('CATEGORY', 95, y + 7);
    doc.text('DURATION', 135, y + 7);
    doc.text('TOTAL AMOUNT (Rs.)', 160, y + 7);

    // Table Row
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.text(`${rental.product?.name || 'Rental Item'}`, 20, y);
    doc.text(`${rental.product?.category || 'General'}`, 95, y);
    doc.text(`${rental.days} Days`, 135, y);
    doc.text(`Rs. ${rental.totalAmount || 0}`, 160, y);

    // Damage fine row if applicable
    if (rental.damageReport?.isDamaged) {
      y += 10;
      doc.setTextColor(220, 38, 38);
      doc.text(`Damage Fine Penalty (${rental.damageReport.damageDetails || 'Item Damage'})`, 20, y);
      doc.text(`+ Rs. ${rental.damageReport.damageCost || 0}`, 160, y);
      doc.setTextColor(30, 41, 59);
    }

    // Summary Totals Box
    y += 20;
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);

    y += 12;
    const damageCost = rental.damageReport?.isDamaged ? (rental.damageReport.damageCost || 0) : 0;
    const grandTotal = (rental.totalAmount || 0) + damageCost;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL AMOUNT PAID:', 110, y);
    doc.setTextColor(79, 70, 229);
    doc.text(`Rs. ${grandTotal}`, 165, y);

    // Footer / Signatures
    y += 40;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for renting with SmartRent!', 15, y);
    doc.text('Authorized Admin Signature: _______________________', 115, y);

    doc.save(`Rental_Bill_${rental.uniqueId || 'IDX3251'}.pdf`);
  };



  const loadRequests = () => {

    api
      .get('/rentals')
      .then((response) =>
        setRequests(response.data)
      );

  };


  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 4000);
    return () => clearInterval(interval);
  }, []);


  const changeStatus =
    async (id, status) => {

      try {

        const response =
          await api.patch(
            '/rentals/' +
              id +
              '/status',
            { status }
          );


        const rental =
          response.data;


        await sendRentalEmail({

          recipientEmail:
            rental.user?.email,

          recipientName:
            rental.user?.username,

          subject:
            `Rental request ${status}: ${
              rental.uniqueId ||
              rental._id
            }`,

          status,

          rental

        });


        loadRequests();

      } catch (error) {

        alert(
          error.response?.data?.message ||
          'Unable to update rental status.'
        );

      }

    };


  const saveEditedDates =
    async () => {

      if (!editRental) return;


      try {

        await api.put(
          '/rentals/' +
            editRental._id,
          {
            startDate:
              editRental.startDate,

            endDate:
              editRental.endDate,

            mobile:
              editRental.mobile,

            uniqueId:
              editRental.uniqueId
          }
        );


        setEditRental(null);

        loadRequests();

      } catch (error) {

        alert(
          error.response?.data?.message ||
          'Unable to update rental.'
        );

      }

    };


  const saveDamageReport =
    async () => {

      if (!damageRental) return;


      try {

        const response =
          await api.patch(
            '/rentals/' +
              damageRental._id +
              '/damage',
            {
              isDamaged:
                damageRental
                  .damageReport
                  ?.isDamaged,

              damageDetails:
                damageRental
                  .damageReport
                  ?.damageDetails,

              damageCost:
                damageRental
                  .damageReport
                  ?.damageCost
            }
          );


        const rental =
          response.data;


        await sendRentalEmail({

          recipientEmail:
            rental.user?.email,

          recipientName:
            rental.user?.username,

          subject:
            `Damage report for rental ${
              rental.uniqueId ||
              rental._id
            }`,

          status:
            'damage report updated',

          rental

        });


        setDamageRental(null);

        loadRequests();

      } catch (error) {

        alert(
          error.response?.data?.message ||
          'Unable to save damage report.'
        );

      }

    };


  const exportDamagePDF =
    (rental) => {

      const doc =
        new jsPDF();


      doc.setFillColor(
        13,
        15,
        23
      );

      doc.rect(
        0,
        0,
        210,
        42,
        'F'
      );


      doc.setTextColor(
        255,
        255,
        255
      );

      doc.setFontSize(20);

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'SMARTRENT - PRODUCT DAMAGE REPORT',
        15,
        26
      );


      doc.setTextColor(
        30,
        41,
        59
      );

      doc.setFontSize(12);


      let y = 56;


      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        `Rental ID: ${
          rental.uniqueId ||
          'IDX3251'
        }`,
        15,
        y
      );


      doc.text(
        `Date: ${
          new Date().toLocaleDateString()
        }`,
        140,
        y
      );


      y += 12;


      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.text(
        `User Name: ${
          rental.user?.username ||
          'Customer'
        }`,
        15,
        y
      );


      doc.text(
        `Mobile: ${
          rental.mobile ||
          'N/A'
        }`,
        140,
        y
      );


      y += 12;


      doc.text(
        `Product Name: ${
          rental.product?.name ||
          'Item'
        }`,
        15,
        y
      );


      doc.text(
        `Category: ${
          rental.product?.category ||
          'N/A'
        }`,
        140,
        y
      );


      y += 12;


      doc.text(
        `Rental Period: ${
          new Date(
            rental.startDate
          ).toLocaleDateString()
        } to ${
          new Date(
            rental.endDate
          ).toLocaleDateString()
        }`,
        15,
        y
      );


      y += 12;


      doc.setLineWidth(
        0.5
      );


      doc.setDrawColor(
        203,
        213,
        225
      );


      doc.line(
        15,
        y,
        195,
        y
      );


      y += 12;


      doc.setFillColor(
        254,
        242,
        242
      );


      doc.rect(
        15,
        y,
        180,
        50,
        'F'
      );


      doc.setDrawColor(
        239,
        68,
        68
      );


      doc.rect(
        15,
        y,
        180,
        50,
        'S'
      );


      doc.setTextColor(
        185,
        28,
        28
      );


      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.setFontSize(14);


      doc.text(
        'OFFICIAL DAMAGE INSPECTION & FINE ASSESSMENT',
        22,
        y + 14
      );


      doc.setTextColor(
        30,
        41,
        59
      );


      doc.setFontSize(11);


      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.text(
        `Damage Details: ${
          rental.damageReport
            ?.damageDetails ||
          'Item damaged during rental period.'
        }`,
        22,
        y + 27
      );


      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        `Assessed Damage Penalty: Rs. ${
          rental.damageReport
            ?.damageCost ||
          0
        }`,
        22,
        y + 40
      );


      y += 75;


      doc.setFontSize(10);


      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.text(
        'Admin Signature: _______________________',
        15,
        y
      );


      doc.text(
        'Customer Signature: _______________________',
        120,
        y
      );


      y += 18;


      doc.setFontSize(9);


      doc.setTextColor(
        148,
        163,
        184
      );


      doc.text(
        'SmartRent Verified System Generated Document.',
        15,
        y
      );


      doc.save(
        `Damage_Report_${
          rental.uniqueId ||
          'IDX3251'
        }.pdf`
      );

    };


  return (

    <Layout admin>

      {actionSuccess && (
        <div className="action-success-banner">
          <div>
            <b>⚡ Gmail Direct Action Complete:</b> Rental <b>#{actionUniqueId || 'ID'}</b> has been successfully <b>{actionSuccess.toUpperCase()}</b> via direct email link!
          </div>
          <button className="action-banner-close" onClick={() => navigate('/admin/requests', { replace: true })}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="page-title-box">

        <div>

          <h1>
            Requests, Approvals &
            Damage Control
          </h1>

          <p>
            Manage rental approvals,
            rejections, dates, and
            damage reports.
          </p>

        </div>

      </div>


      {requests.map((x) => (

        <div
          className="black-fitted-card"
          key={x._id}
        >

          <div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >

              <span
                className="id-badge"
                style={{
                  fontSize: '11px',
                  padding: '3px 10px'
                }}
              >
                {x.uniqueId ||
                  'IDX3251'}
              </span>


              <b
                style={{
                  fontSize: '17px',
                  color:
                    'var(--text-main)'
                }}
              >
                {x.product?.name}
              </b>

            </div>


            <p
              style={{
                color:
                  'var(--text-muted)',
                fontSize: '13px',
                marginTop: '6px'
              }}
            >
              User:
              {' '}
              <b>
                {x.user?.username}
              </b>
              {' '}
              ({x.user?.email})
              {' • '}
              Mobile:
              {' '}
              <b>
                {x.mobile || 'N/A'}
              </b>
            </p>


            <p
              style={{
                color:
                  'var(--text-sub)',
                fontSize: '12px',
                marginTop: '4px'
              }}
            >
              Rental Window:
              {' '}
              {new Date(
                x.startDate
              ).toLocaleDateString()}
              {' – '}
              {new Date(
                x.endDate
              ).toLocaleDateString()}
              {' '}
              ({x.days}
              {' '}Days • ₹
              {x.totalAmount})
            </p>


            {x.damageReport
              ?.isDamaged && (

              <div
                className="status-pill status-rejected"
                style={{
                  marginTop: '8px'
                }}
              >
                <AlertTriangle
                  size={14}
                />
                Damaged Report:
                {' '}₹
                {
                  x.damageReport
                    .damageCost
                }
                {' '}Fine
              </div>

            )}

            {/* REAL-TIME PROCESS LIFECYCLE MONITORING TRACKER */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>LIFECYCLE MONITORING:</span>
              <span className="status-pill" style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                1. REQUESTED
              </span>
              <span style={{ color: '#475569', fontSize: '10px' }}>➔</span>
              <span className="status-pill" style={{ fontSize: '10px', padding: '2px 8px', background: (x.status === 'approved' || x.status === 'returned') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: (x.status === 'approved' || x.status === 'returned') ? '#10b981' : '#64748b', border: `1px solid ${(x.status === 'approved' || x.status === 'returned') ? 'rgba(16, 185, 129, 0.4)' : '#2d354e'}` }}>
                2. APPROVED & ACTIVE
              </span>
              <span style={{ color: '#475569', fontSize: '10px' }}>➔</span>
              <span className="status-pill" style={{ fontSize: '10px', padding: '2px 8px', background: x.status === 'returned' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: x.status === 'returned' ? '#10b981' : '#64748b', border: `1px solid ${x.status === 'returned' ? 'rgba(16, 185, 129, 0.4)' : '#2d354e'}` }}>
                3. RETURNED & INSPECTED
              </span>
              <span style={{ color: '#475569', fontSize: '10px' }}>➔</span>
              <span className="status-pill" style={{ fontSize: '10px', padding: '2px 8px', background: x.status === 'returned' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.05)', color: x.status === 'returned' ? '#10b981' : '#64748b', border: `1px solid ${x.status === 'returned' ? 'rgba(16, 185, 129, 0.4)' : '#2d354e'}` }}>
                4. BILLED & CLOSED
              </span>
            </div>

          </div>


          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >

            <span
              className={`status-pill status-${x.status}`}
            >
              {x.status}
            </span>


            {x.status ===
              'pending' && (

              <>

                <button
                  className="btn btn-green btn-sm"
                  onClick={() =>
                    changeStatus(
                      x._id,
                      'approved'
                    )
                  }
                >
                  <Check size={16} />
                  Approve
                </button>


                <button
                  className="btn btn-red btn-sm"
                  onClick={() =>
                    changeStatus(
                      x._id,
                      'rejected'
                    )
                  }
                >
                  Reject
                </button>

              </>

            )}


            {x.status ===
              'approved' && (

              <button
                className="btn btn-dark btn-sm"
                onClick={() =>
                  changeStatus(
                    x._id,
                    'returned'
                  )
                }
              >
                Mark Returned
              </button>

            )}

            {x.status === 'returned' && (
              <button
                className="btn btn-green btn-sm"
                onClick={() => setBillRental(x)}
              >
                <FileText size={16} /> Generate & View Bill
              </button>
            )}


            <button
              className="btn btn-dark btn-sm"
              onClick={() =>
                setEditRental(x)
              }
            >
              <Calendar size={16} />
              Edit Dates/ID
            </button>


            <button
              className="btn btn-dark btn-sm"
              onClick={() =>
                setDamageRental(x)
              }
            >
              <AlertTriangle size={16} />
              Damage Report
            </button>


            {x.damageReport
              ?.isDamaged && (

              <button
                className="btn btn-green btn-sm"
                onClick={() =>
                  exportDamagePDF(x)
                }
              >
                <FileText
                  size={16}
                />
                Download Damage PDF
              </button>

            )}

          </div>

        </div>

      ))}


      {!requests.length && (

        <div
          className="black-fitted-card"
          style={{
            justifyContent:
              'center',
            padding: '40px'
          }}
        >

          <p
            style={{
              color:
                'var(--text-muted)'
            }}
          >
            No rental requests
            submitted yet.
          </p>

        </div>

      )}


      {/* =====================================================
          EDIT RENTAL MODAL
      ====================================================== */}

      {editRental && (

        <div className="modal-overlay">

          <div className="modal-content">

            <div className="modal-header">

              <h3>
                Edit Request Dates &
                User Details
              </h3>

              <button
                className="btn-logout"
                onClick={() =>
                  setEditRental(null)
                }
              >
                X
              </button>

            </div>


            <label>
              Assigned Rental ID
            </label>

            <input
              value={
                editRental.uniqueId ||
                ''
              }
              onChange={(e) =>
                setEditRental({
                  ...editRental,
                  uniqueId:
                    e.target.value
                })
              }
            />


            <label>
              Mobile Number
            </label>

            <input
              value={
                editRental.mobile ||
                ''
              }
              onChange={(e) =>
                setEditRental({
                  ...editRental,
                  mobile:
                    e.target.value
                })
              }
            />


            <label>
              Start Date
            </label>

            <input
              type="date"
              value={
                editRental.startDate
                  ? editRental.startDate.slice(
                      0,
                      10
                    )
                  : ''
              }
              onChange={(e) =>
                setEditRental({
                  ...editRental,
                  startDate:
                    e.target.value
                })
              }
            />


            <label>
              End Date
            </label>

            <input
              type="date"
              value={
                editRental.endDate
                  ? editRental.endDate.slice(
                      0,
                      10
                    )
                  : ''
              }
              onChange={(e) =>
                setEditRental({
                  ...editRental,
                  endDate:
                    e.target.value
                })
              }
            />


            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '12px'
              }}
            >

              <button
                className="btn btn-green full"
                onClick={
                  saveEditedDates
                }
              >
                Save Modifications
              </button>


              <button
                className="btn btn-dark"
                onClick={() =>
                  setEditRental(null)
                }
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          DAMAGE REPORT MODAL
      ====================================================== */}

      {damageRental && (

        <div className="modal-overlay">

          <div className="modal-content">

            <div className="modal-header">

              <h3>
                Damage Inspection &
                PDF Report
              </h3>

              <button
                className="btn-logout"
                onClick={() =>
                  setDamageRental(null)
                }
              >
                X
              </button>

            </div>


            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >

              <input
                type="checkbox"
                id="damage-check"
                checked={
                  damageRental
                    .damageReport
                    ?.isDamaged ||
                  false
                }
                onChange={(e) =>
                  setDamageRental({
                    ...damageRental,

                    damageReport: {
                      ...(damageRental
                        .damageReport ||
                        {}),

                      isDamaged:
                        e.target.checked
                    }

                  })
                }
                style={{
                  width: 'auto'
                }}
              />


              <label
                htmlFor="damage-check"
                style={{
                  textTransform:
                    'none',
                  fontSize: '14px',
                  color:
                    'var(--text-main)'
                }}
              >
                Flag Product as
                Damaged
              </label>

            </div>


            <label>
              Damage Notes /
              Description
            </label>

            <textarea
              rows="3"
              placeholder="e.g. Scratched lens, missing cable, body cracks..."
              value={
                damageRental
                  .damageReport
                  ?.damageDetails ||
                ''
              }
              onChange={(e) =>
                setDamageRental({
                  ...damageRental,

                  damageReport: {
                    ...(damageRental
                      .damageReport ||
                      {}),

                    damageDetails:
                      e.target.value
                  }

                })
              }
            />


            <label>
              Assessed Damage
              Penalty (₹)
            </label>

            <input
              type="number"
              placeholder="e.g. 500"
              value={
                damageRental
                  .damageReport
                  ?.damageCost ||
                ''
              }
              onChange={(e) =>
                setDamageRental({
                  ...damageRental,

                  damageReport: {
                    ...(damageRental
                      .damageReport ||
                      {}),

                    damageCost:
                      +e.target.value
                  }

                })
              }
            />


            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: '10px',
                marginTop: '12px'
              }}
            >

              <button
                className="btn btn-green full"
                onClick={async () => {

                  await saveDamageReport();

                  exportDamagePDF(
                    damageRental
                  );

                  setDamageRental(
                    null
                  );

                }}
              >
                <FileText
                  size={18}
                />
                Save & Download
                Damage PDF
              </button>


              <button
                className="btn btn-dark full"
                onClick={
                  saveDamageReport
                }
              >
                Save Only
              </button>

            </div>

          </div>

        </div>

      )}

      {/* RENTAL BILL / TAX INVOICE MODAL */}
      {billRental && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', background: '#111420', color: '#fff' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
                <FileText size={20} color="#10b981" /> Official Rental Invoice & Bill
              </h3>
              <button className="btn-logout" onClick={() => setBillRental(null)}>X</button>
            </div>

            <div style={{ background: '#151926', border: '1px solid var(--border-light)', padding: '20px', borderRadius: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>Invoice No:</span>
                  <b style={{ display: 'block', color: 'var(--accent-indigo)', fontSize: '15px' }}>INV-2026-{billRental.uniqueId || 'IDX3251'}</b>
                </div>
                <span className="status-pill status-approved">RETURNED & PAID</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '14px' }}>
                <div>
                  <span style={{ color: 'var(--text-sub)' }}>Customer Name:</span>
                  <p style={{ fontWeight: '700', margin: '2px 0' }}>{billRental.user?.username || 'Customer'}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>{billRental.user?.email}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-sub)' }}>Contact Mobile:</span>
                  <p style={{ fontWeight: '700', margin: '2px 0' }}>{billRental.mobile || 'N/A'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-sub)' }}>Product Name:</span>
                  <p style={{ fontWeight: '700', margin: '2px 0' }}>{billRental.product?.name || 'Item'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-sub)' }}>Category:</span>
                  <p style={{ fontWeight: '700', margin: '2px 0' }}>{billRental.product?.category || 'General'}</p>
                </div>
              </div>

              <div style={{ background: '#0d0f17', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  <span>Rental Period ({billRental.days} Days):</span>
                  <span>₹{billRental.totalAmount || 0}</span>
                </div>
                {billRental.damageReport?.isDamaged && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--accent-red)', marginBottom: '6px' }}>
                    <span>Damage Penalty Fine ({billRental.damageReport.damageDetails || 'Damage'}):</span>
                    <span>+ ₹{billRental.damageReport.damageCost || 0}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', color: 'var(--accent-green)', borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '6px' }}>
                  <span>Grand Total Amount:</span>
                  <span>₹{(billRental.totalAmount || 0) + (billRental.damageReport?.isDamaged ? (billRental.damageReport.damageCost || 0) : 0)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-green full" onClick={() => exportRentalBillPDF(billRental)}>
                <FileText size={18} /> Download Official PDF Bill
              </button>
              <button className="btn btn-dark" onClick={() => setBillRental(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}


// ============================================================
// LIVE NOTIFICATIONS & PROCESS ACTIVITY CENTER
// ============================================================

function NotificationsCenter({ admin = false }) {
  const [filter, setFilter] = useState('all');
  const [selectedHistory, setSelectedHistory] = useState(null);
  const notifData = useRealtimeNotifications();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh } = notifData;

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'requested') return notifications.filter((n) => n.type === 'rental_requested');
    if (filter === 'approved') return notifications.filter((n) => n.type === 'rental_approved');
    if (filter === 'returned') return notifications.filter((n) => n.type === 'rental_returned');
    if (filter === 'damage') return notifications.filter((n) => n.type === 'damage_reported');
    return notifications;
  }, [notifications, filter]);

  return (
    <Layout admin={admin}>
      {selectedHistory && (
        <NotificationHistoryModal
          notif={selectedHistory}
          onClose={() => setSelectedHistory(null)}
          admin={admin}
        />
      )}

      <div className="page-title-box notif-page-header">
        <div>
          <h1>Live Activity & Notifications</h1>
          <p>Real-time lifecycle monitoring of requests, approvals, returns, and damage assessments.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button className="btn btn-green btn-sm" onClick={markAllAsRead}>
              <Check size={16} /> Mark All as Read ({unreadCount})
            </button>
          )}
          <button className="btn btn-dark btn-sm" onClick={refresh}>
            <Sparkles size={16} /> Refresh Feed
          </button>
        </div>
      </div>

      <div className="notif-filter-tabs">
        <button
          className={`notif-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Activity ({notifications.length})
        </button>
        <button
          className={`notif-filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`notif-filter-btn ${filter === 'requested' ? 'active' : ''}`}
          onClick={() => setFilter('requested')}
        >
          📥 Requests
        </button>
        <button
          className={`notif-filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          ✅ Approvals
        </button>
        <button
          className={`notif-filter-btn ${filter === 'returned' ? 'active' : ''}`}
          onClick={() => setFilter('returned')}
        >
          📦 Returns
        </button>
        <button
          className={`notif-filter-btn ${filter === 'damage' ? 'active' : ''}`}
          onClick={() => setFilter('damage')}
        >
          ⚠️ Damages
        </button>
      </div>

      <div>
        {filtered.map((n) => {
          const { cls, icon } = getNotifIconInfo(n.type);
          return (
            <div
              key={n._id}
              className={`notif-card-item ${!n.isRead ? 'unread' : ''}`}
              onClick={() => {
                if (!n.isRead) markAsRead(n._id);
                setSelectedHistory(n);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className={`notif-icon ${cls}`} style={{ width: '40px', height: '40px', fontSize: '18px' }}>
                {icon}
              </div>
              <div className="notif-card-body">
                <div className="notif-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {n.uniqueId && (
                      <span className="id-badge" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        #{n.uniqueId}
                      </span>
                    )}
                    <h4>{n.title}</h4>
                  </div>
                  <span>{formatNotifTime(n.createdAt)}</span>
                </div>
                <p className="notif-card-text">{n.message}</p>
                <div className="notif-card-footer" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-green btn-sm"
                    onClick={() => {
                      if (!n.isRead) markAsRead(n._id);
                      setSelectedHistory(n);
                    }}
                  >
                    <Clock3 size={14} /> View Complete Journey History
                  </button>
                  <Link
                    to={admin ? '/admin/requests' : '/rentals'}
                    className="btn btn-dark btn-sm"
                    style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '12px' }}
                  >
                    {admin ? 'Requests & Approvals' : 'My Rentals'} &rarr;
                  </Link>
                  {!n.isRead && (
                    <button className="btn btn-dark btn-sm" onClick={(e) => markAsRead(n._id, e)}>
                      <Check size={14} /> Mark Read
                    </button>
                  )}
                  <button className="btn btn-red btn-sm" onClick={(e) => deleteNotification(n._id, e)}>
                    <Trash2 size={14} /> Clear
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="black-fitted-card" style={{ justifyContent: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              No notification messages match this filter.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}


// ============================================================
// MAIN APP + ROUTER
// ============================================================

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Routes>
        {/* HOME */}
        <Route
          path="/"
          element={
            getUser()?.role === 'admin' ? <Navigate to="/admin" replace /> : <Browse />
          }
        />

        {/* AUTHENTICATION */}
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth signup />} />

        {/* USER ROUTES */}
        <Route
          path="/browse"
          element={
            <Guard role="user">
              <Browse />
            </Guard>
          }
        />
        <Route
          path="/product/:id"
          element={
            <Guard role="user">
              <ProductDetails />
            </Guard>
          }
        />
        <Route
          path="/payment/:id"
          element={
            <Guard role="user">
              <Payment />
            </Guard>
          }
        />
        <Route
          path="/rentals"
          element={
            <Guard role="user">
              <Rentals />
            </Guard>
          }
        />
        <Route
          path="/notifications"
          element={
            <Guard role="user">
              <NotificationsCenter />
            </Guard>
          }
        />

        {/* ADMIN ROUTES */}
        <Route
          path="/admin"
          element={
            <Guard role="admin">
              <AdminDashboard />
            </Guard>
          }
        />
        <Route
          path="/admin/products"
          element={
            <Guard role="admin">
              <ManageProducts />
            </Guard>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <Guard role="admin">
              <RentalRequests />
            </Guard>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <Guard role="admin">
              <NotificationsCenter admin />
            </Guard>
          }
        />

        {/* INVALID URL */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </GoogleOAuthProvider>
  );
}