import './Button.css'

export default function Button({ children, variant = 'primary', type = 'button', disabled, onClick, className = '' }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
