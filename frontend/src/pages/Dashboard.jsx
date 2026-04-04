import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [adminData, setAdminData] = useState(null)
  const [meData, setMeData] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (isAdmin) {
          const d = await api.analytics.summary()
          if (!cancelled) setAdminData(d)
        } else {
          const d = await api.analytics.me()
          if (!cancelled) setMeData(d)
        }
      } catch (e) {
        if (!cancelled) toast.error(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  if (loading) {
    return <div className="text-slate-400">Loading dashboard…</div>
  }

  if (isAdmin && adminData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-slate-400">Organization overview and analytics.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
            <div className="text-3xl font-bold text-white">{adminData.total_employees}</div>
            <div className="text-sm text-slate-400">Total employees</div>
            <Link to="/employees" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
              Manage →
            </Link>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
            <div className="text-3xl font-bold text-emerald-400">{adminData.present_count}</div>
            <div className="text-sm text-slate-400">Present records (all time)</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
            <div className="text-3xl font-bold text-red-400">{adminData.absent_count}</div>
            <div className="text-sm text-slate-400">Absent records (all time)</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
          <h2 className="text-lg font-medium text-white">Monthly attendance</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2 pr-4">Period</th>
                  <th className="pb-2 pr-4">Present</th>
                  <th className="pb-2">Absent</th>
                </tr>
              </thead>
              <tbody>
                {adminData.monthly_attendance?.length ? (
                  adminData.monthly_attendance.map((row) => (
                    <tr key={row.period} className="border-b border-slate-800 text-slate-200">
                      <td className="py-2 pr-4">{row.label}</td>
                      <td className="py-2 pr-4 text-emerald-400">{row.present}</td>
                      <td className="py-2 text-red-400">{row.absent}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">
                      No attendance data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
          <h2 className="text-lg font-medium text-white">By department</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2 pr-4">Department</th>
                  <th className="pb-2">Employees</th>
                </tr>
              </thead>
              <tbody>
                {adminData.department_stats?.length ? (
                  adminData.department_stats.map((row) => (
                    <tr key={row.department} className="border-b border-slate-800 text-slate-200">
                      <td className="py-2 pr-4">{row.department}</td>
                      <td className="py-2">{row.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 text-slate-500">
                      No employees yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin && meData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">My dashboard</h1>
          <p className="text-slate-400">
            {meData.full_name} · {meData.department}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
            <div className="text-2xl font-bold text-emerald-400">{meData.present_days}</div>
            <div className="text-sm text-slate-400">Present days</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
            <div className="text-2xl font-bold text-red-400">{meData.absent_days}</div>
            <div className="text-sm text-slate-400">Absent days</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
            <div className="text-2xl font-bold text-amber-400">{meData.pending_leaves}</div>
            <div className="text-sm text-slate-400">Pending leaves</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
            <div className="text-2xl font-bold text-blue-400">{meData.approved_leaves}</div>
            <div className="text-sm text-slate-400">Approved leaves</div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            to="/attendance"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Attendance
          </Link>
          <Link
            to="/leaves"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Leaves
          </Link>
        </div>
      </div>
    )
  }

  return <p className="text-slate-400">Unable to load dashboard.</p>
}
