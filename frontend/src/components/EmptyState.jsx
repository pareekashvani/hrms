import './EmptyState.css'

export default function EmptyState({ message, description }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">—</div>
      <p className="empty-state-message">{message}</p>
      {description && <p className="empty-state-desc">{description}</p>}
    </div>
  )
}
