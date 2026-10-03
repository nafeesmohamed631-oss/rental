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
  Calendar
  ,ArrowRight
  ,ArrowLeft
  ,Home
  ,BookOpen
  ,Camera
  ,Laptop
  ,Smartphone
  ,Headphones
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
// GLOBAL LAYOUT
// ============================================================

function Layout({ admin = false, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    navigate('/login');
  };

  return (
    <>
      <header>
        <Link
          className="logo"
          to={admin ? '/admin' : '/browse'}
        >
          Smart<span>Rent</span>
        </Link>

        <div className="header-right">
          <Link className="home-link" to={admin ? '/admin' : '/browse'} title="Home">
            <Home size={16} />
            <span>Home</span>
          </Link>
          {user ? (
            <>
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
            {admin
              ? 'ADMIN DASHBOARD'
              : 'USER DASHBOARD'}
          </div>

          {admin ? (
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

  const [rentals, setRentals] =
    useState([]);


  useEffect(() => {

    api
      .get('/rentals/mine')
      .then((response) =>
        setRentals(response.data)
      );

  }, []);


  return (

    <Layout>

      <div className="page-title-box">

        <div>

          <h1>
            My Rental Requests
          </h1>

          <p>
            Track your rental request
            status, approval updates,
            and active items.
          </p>

        </div>

      </div>


      {rentals.map((x) => (

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
              {x.days}
              {' '}Days • Total: ₹
              {x.totalAmount}
              {' '}• Mobile:
              {' '}
              {x.mobile || 'N/A'}
            </p>


            {x.startDate &&
              x.endDate && (

                <p
                  style={{
                    color:
                      'var(--text-sub)',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}
                >
                  Dates:
                  {' '}
                  {new Date(
                    x.startDate
                  ).toLocaleDateString()}
                  {' to '}
                  {new Date(
                    x.endDate
                  ).toLocaleDateString()}
                </p>

              )}

          </div>


          <div>

            <span
              className={`status-pill status-${x.status}`}
            >
              {x.status}
            </span>

          </div>

        </div>

      ))}


      {!rentals.length && (

        <div
          className="black-fitted-card"
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
            You have no active rental
            requests yet.
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

  const [requests, setRequests] = useState([]);
  const [editRental, setEditRental] = useState(null);
  const [damageRental, setDamageRental] = useState(null);
  const [billRental, setBillRental] = useState(null);

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
// MAIN APP + ROUTER
// ============================================================

export default function App() {

  return (

    <GoogleOAuthProvider
      clientId={
        GOOGLE_CLIENT_ID
      }
    >

      <Routes>

        {/* HOME */}

        <Route
          path="/"
          element={
            getUser()?.role === 'admin' ? <Navigate to="/admin" replace /> : <Browse />
          }
        />


        {/* AUTHENTICATION */}

        <Route
          path="/login"
          element={
            <Auth />
          }
        />

        <Route
          path="/signup"
          element={
            <Auth signup />
          }
        />


        {/* USER */}

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


        {/* ADMIN */}

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


        {/* INVALID URL */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>

    </GoogleOAuthProvider>

  );
}