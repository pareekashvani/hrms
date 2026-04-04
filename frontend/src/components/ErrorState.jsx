import './ErrorState.css'

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-state-icon">!</div>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button type="button" className="error-state-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
