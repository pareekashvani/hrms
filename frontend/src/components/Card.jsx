import './Card.css'

export default function Card({ title, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </div>
  )
}
