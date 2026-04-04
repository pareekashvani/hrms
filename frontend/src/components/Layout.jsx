import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <header className="border-b border-slate-800 bg-[#1a2332]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="text-lg font-semibold text-white no-underline hover:text-blue-400">
            HRMS Lite
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/employees" className={linkClass}>
              Employees
            </NavLink>
            <NavLink to="/attendance" className={linkClass}>
              Attendance
            </NavLink>
            <NavLink to="/leaves" className={linkClass}>
              Leaves
            </NavLink>
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>
              {user?.name}
              <span className="ml-2 rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
                {user?.role}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
