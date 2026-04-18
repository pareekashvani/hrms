import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentPositionAsync } from '../geo'

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [adminData, setAdminData] = useState(null)
  const [meData, setMeData] = useState(null)
  const [locationStatus, setLocationStatus] = useState(null)
  const [radiusInput, setRadiusInput] = useState(30)
  const [settingLocation, setSettingLocation] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (isAdmin) {
          const [d, loc] = await Promise.all([
            api.analytics.summary(),
            api.admin.locationStatus().catch(() => null),
          ])
          if (!cancelled) {
            setAdminData(d)
            setLocationStatus(loc)
            if (loc?.radius_meters) setRadiusInput(loc.radius_meters)
          }
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

  async function handleSetAdminLocation() {
    setSettingLocation(true)
    try {
      const pos = await getCurrentPositionAsync()
      const r = Number(radiusInput)
      const status = await api.admin.setAdminLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radius_meters: Number.isFinite(r) && r >= 1 ? Math.round(r) : 30,
      })
      setLocationStatus(status)
      toast.success('Admin location saved. Employees will be checked against this point.')
    } catch (err) {
      const code = err?.code
      if (code === 1) {
        toast.error('Location permission denied. Allow location access for this site and try again.')
      } else if (err?.message === 'unsupported') {
        toast.error('This browser does not support GPS location.')
      } else {
        toast.error(err?.message || 'Could not save location.')
      }
    } finally {
      setSettingLocation(false)
    }
  }

  async function handleClearAdminLocation() {
    try {
      const status = await api.admin.clearAdminLocation()
      setLocationStatus(status)
      toast.success('Saved location cleared. Env-based coordinates apply if configured.')
    } catch (e) {
      toast.error(e.message)
    }
  }

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
          <h2 className="text-lg font-medium text-white">Attendance geofence anchor</h2>
          <p className="mt-1 text-sm text-slate-400">
            When active, employees must mark attendance from within the radius of this GPS point. The
            database-stored location overrides server environment variables when set.
          </p>
          {locationStatus ? (
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Status:</span>{' '}
                {locationStatus.geofence_active ? (
                  <span className="text-emerald-400">Active</span>
                ) : (
                  <span className="text-amber-400">Inactive</span>
                )}{' '}
                <span className="text-slate-500">· Source:</span>{' '}
                <span className="text-slate-200">{locationStatus.source}</span>
                {locationStatus.updated_at ? (
                  <>
                    {' '}
                    <span className="text-slate-500">· Updated:</span>{' '}
                    {new Date(locationStatus.updated_at).toLocaleString()}
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Radius (meters)</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={radiusInput}
                    onChange={(e) => setRadiusInput(e.target.value)}
                    className="w-24 rounded-lg border border-slate-600 bg-[#0f1419] px-2 py-1.5 text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={settingLocation}
                  onClick={handleSetAdminLocation}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {settingLocation ? 'Reading GPS…' : 'Set current location'}
                </button>
                {locationStatus.source === 'database' ? (
                  <button
                    type="button"
                    onClick={handleClearAdminLocation}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    Clear saved location
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Loading location status…</p>
          )}
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
