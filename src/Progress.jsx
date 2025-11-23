export default function Progress({ score }) {
  const getColor = () => {
    if (score > 85) return "bg-green-500"
    if (score > 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getLabel = () => {
    if (score > 85) return "Excellent"
    if (score > 60) return "Good"
    if (score > 0) return "Keep Practicing"
    return "Not Yet Evaluated"
  }

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-label">Mastery {score}%</span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${getColor()}`}
          style={{'--progress-width': `${Math.max(score, 2)}%`}}
        />
      </div>
      <p className="progress-status">{getLabel()}</p>
    </div>
  )
}
