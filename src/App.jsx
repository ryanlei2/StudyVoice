import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom"
import HomePage from "./pages/HomePage"
import LandingPage from "./pages/LandingPage"
import Auth from "./components/Auth"
import "./App.css"

function Navbar({ user, onLogout }) {
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-brand">
            <div className="navbar-logo">
              <span>🎤</span>
            </div>
            <Link to={user ? "/home" : "/"} className="navbar-title navbar-title-clickable">
              StudyVoice AI
            </Link>
          </div>
          <div className="navbar-links">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="navbar-user">{user.email}</span>
                <button onClick={onLogout} className="navbar-logout">
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={() => navigate("/auth")} className="navbar-signin">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function AppContent() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const email = localStorage.getItem('userEmail')
    if (token && email) {
      setUser({ token, email })
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    setUser(null)
    navigate('/')
  }

  const handleLogin = (token, email) => {
    const userData = { token, email }
    setUser(userData)
    navigate('/home')
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main className={`main-content ${user ? 'with-padding' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/auth" 
            element={user ? <Navigate to="/home" /> : <Auth onLogin={handleLogin} />} 
          />
          <Route 
            path="/home" 
            element={user ? <HomePage user={user} /> : <Navigate to="/auth" />} 
          />
        </Routes>
      </main>
      
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h3 className="footer-title">StudyVoice AI</h3>
              <p className="footer-description">
                Revolutionizing education through AI-powered voice interaction and personalized learning experiences.
              </p>
            </div>
            <div className="footer-section">
              <h4 className="footer-heading">Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#" className="footer-link">Privacy Policy</a></li>
                <li><a href="#" className="footer-link">Terms of Service</a></li>
                <li><a href="#" className="footer-link">Support</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-heading">Connect</h4>
              <ul className="footer-links">
                <li><a href="#" className="footer-link">GitHub</a></li>
                <li><a href="#" className="footer-link">Twitter</a></li>
                <li><a href="#" className="footer-link">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2024 StudyVoice AI. All rights reserved. Built with ❤️ for better learning.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
