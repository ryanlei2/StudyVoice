export default function LandingPage({ onTryNow }) {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Master Any Subject with
              <span className="hero-gradient"> AI-Powered Voice Learning</span>
            </h1>
            <p className="hero-description">
              Upload your study materials and practice explaining concepts out loud. 
              Get instant AI feedback to improve your understanding and retention.
            </p>
            <button onClick={onTryNow} className="hero-btn">
              Try Now - It's Free
            </button>
          </div>
          <div className="hero-visual">
            <div className="hero-icon">🎤</div>
          </div>
        </div>
      </section>

      {/* Who is this for Section */}
      <section className="audience-section">
        <div className="audience-container">
          <h2 className="audience-title">Who is this for?</h2>
          <div className="audience-grid">
            <div className="audience-card">
              <div className="audience-icon">🎓</div>
              <h3 className="audience-card-title">Students</h3>
              <p className="audience-card-description">
                Perfect for exam prep, concept review, and active learning through verbal explanation.
              </p>
            </div>
            <div className="audience-card">
              <div className="audience-icon">👨‍🏫</div>
              <h3 className="audience-card-title">Educators</h3>
              <p className="audience-card-description">
                Help students practice and assess their understanding through AI-powered feedback.
              </p>
            </div>
            <div className="audience-card">
              <div className="audience-icon">💼</div>
              <h3 className="audience-card-title">Professionals</h3>
              <p className="audience-card-description">
                Master new skills, prepare for presentations, and reinforce training materials.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}