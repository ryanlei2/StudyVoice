import { useState, useEffect } from "react"
import HomePage from "./pages/HomePage"
import LandingPage from "./pages/LandingPage"
import Auth from "./components/Auth"
import "./App.css"

export default function App() {
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [homePageRef, setHomePageRef] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const email = localStorage.getItem('userEmail')
    if (token && email) {
      setUser({ token, email })
    }
  }, [])

  const handleUserChange = (userData) => {
    setUser(userData)
    if (userData) {
      setShowAuth(false)
    }
  }

  const handleTryNow = () => {
    setShowAuth(true)
  }

  const handleAuthLogin = (token, email) => {
    const userData = { token, email }
    setUser(userData)
    setShowAuth(false)
  }

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            <div className="navbar-brand">
              <div className="navbar-logo">
                <span>🎤</span>
              </div>
              <h1 
                className="navbar-title navbar-title-clickable"
                onClick={() => {
                  setShowAuth(false)
                  if (user && homePageRef) {
                    homePageRef.goToTopics()
                  }
                }}
              >
                StudyVoice AI
              </h1>
            </div>
            <div className="navbar-links">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="navbar-user">{user.email}</span>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('userEmail')
                      setUser(null)
                      handleUserChange(null)
                    }}
                    className="navbar-logout"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button onClick={handleTryNow} className="navbar-signin">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`main-content ${user ? 'with-padding' : ''}`}>
        {user ? (
          <HomePage onUserChange={handleUserChange} user={user} ref={setHomePageRef} />
        ) : showAuth ? (
          <Auth onLogin={handleAuthLogin} />
        ) : (
          <LandingPage onTryNow={handleTryNow} />
        )}
      </main>
      
      {/* Footer */}
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
