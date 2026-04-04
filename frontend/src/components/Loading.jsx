import './Loading.css'

export default function Loading() {
  return (
    <div className="loading" aria-label="Loading">
      <div className="loading-spinner" />
      <p className="loading-text">Loading...</p>
    </div>
  )
}
