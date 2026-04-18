import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentPositionAsync } from '../geo'

/** Combine attendance date (YYYY-MM-DD) with HTML time value (HH:mm or HH:mm:ss) into UTC ISO for the API. */
function combineDateAndTimeToIso(dateStr, timeStr) {
  const t = String(timeStr ?? '').trim()
  if (!t) return null
  const d = String(dateStr ?? '').trim()
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const [hh, mm, secRaw] = t.split(':')
  const h = Number(hh)
  const m = Number(mm)
  const s = secRaw != null && secRaw !== '' ? Number(String(secRaw).slice(0, 2)) : 0
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null
  const [y, mo, day] = d.split('-').map(Number)
  const local = new Date(y, mo - 1, day, h, m, s, 0)
  return Number.isNaN(local.getTime()) ? null : local.toISOString()
}

/**
 * API returns naive ISO datetimes (e.g. "2026-04-21T04:30:00") for values stored as UTC wall time.
 * `new Date(...)` would treat those as *local* time, shifting IST display by 5h30.
 * Treat naive strings as UTC by appending Z when no offset is present.
 */
function parseApiDateTimeAsUtc(value) {
  if (value == null || value === '') return null
  let s = String(value).trim()
  if (!s) return null
  s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
  const hasExplicitTz =
    /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{2}\d{2}$/.test(s)
  if (!hasExplicitTz && /^\d{4}-\d{2}-\d{2}T/.test(s)) {
    s = `${s}Z`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatStoredTime(iso) {
  if (!iso) return '—'
  const d = parseApiDateTimeAsUtc(iso)
  if (!d) return '—'
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

export default function Attendance() {
  const { user, isAdmin } = useAuth()
  const myEmployeeId = user?.employee?.id

  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filterEmployeeId, setFilterEmployeeId] = useState('')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [geofence, setGeofence] = useState(null)

  const [form, setForm] = useState({
    employee_id: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'Present',
    check_in_time: '',
    check_out_time: '',
  })

  const loadEmployees = useCallback(async () => {
    const list = await api.employees.list({ limit: 500 })
    setEmployees(list || [])
  }, [])

  const loadAttendance = useCallback(async () => {
    const params = {}
    if (filterEmployeeId) params.employee_id = Number(filterEmployeeId)
    if (filterFromDate) params.from_date = filterFromDate
    if (filterToDate) params.to_date = filterToDate
    const list = await api.attendance.list(params)
    setAttendance(list || [])
  }, [filterEmployeeId, filterFromDate, filterToDate])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        await loadEmployees()
        if (!cancelled && !isAdmin && myEmployeeId) {
          setForm((f) => ({ ...f, employee_id: String(myEmployeeId) }))
        }
        await loadAttendance()
      } catch (e) {
        if (!cancelled) toast.error(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [isAdmin, myEmployeeId, loadEmployees, loadAttendance])

  useEffect(() => {
    let cancelled = false
    api.attendance
      .geofenceConfig()
      .then((cfg) => {
        if (!cancelled) setGeofence(cfg)
      })
      .catch(() => {
        if (!cancelled) setGeofence({ enabled: false, radius_meters: 20 })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.employee_id) {
      toast.error('Select an employee')
      return
    }
    const dateStr = String(form.date ?? '').trim()
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      toast.error('Date is required')
      return
    }
    if (form.status !== 'Present' && form.status !== 'Absent') {
      toast.error('Status is required')
      return
    }
    const checkInTimeTrimmed = String(form.check_in_time ?? '').trim()
    if (!checkInTimeTrimmed) {
      toast.error('Please select check-in time')
      return
    }
    const checkInIso = combineDateAndTimeToIso(form.date, form.check_in_time)
    if (!checkInIso) {
      toast.error('Please select check-in time')
      return
    }

    let latitude
    let longitude
    if (!isAdmin && geofence?.enabled) {
      try {
        const pos = await getCurrentPositionAsync()
        latitude = pos.coords.latitude
        longitude = pos.coords.longitude
      } catch (err) {
        const code = err?.code
        if (code === 1) {
          toast.error('Location permission denied. Allow location access to mark attendance.')
        } else if (err?.message === 'unsupported') {
          toast.error('This browser does not support GPS location.')
        } else {
          toast.error('Could not read your location. Try again with GPS enabled or move outdoors.')
        }
        return
      }
    }

    setSubmitting(true)
    try {
      const body = {
        employee_id: Number(form.employee_id),
        date: form.date,
        status: form.status,
        check_in_time: checkInIso,
        check_out_time: combineDateAndTimeToIso(form.date, form.check_out_time),
      }
      if (latitude != null && longitude != null) {
        body.latitude = latitude
        body.longitude = longitude
      }
      await api.attendance.mark(body)
      toast.success('Attendance saved')
      await loadAttendance()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function applyFilters() {
    setLoading(true)
    try {
      await loadAttendance()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function clearFilters() {
    setFilterEmployeeId('')
    setFilterFromDate('')
    setFilterToDate('')
    setLoading(true)
    try {
      const list = await api.attendance.list()
      setAttendance(list || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const employeeMap = Object.fromEntries((employees || []).map((e) => [e.id, e]))

  const employeeOptions = isAdmin
    ? employees
    : employees.filter((e) => e.id === myEmployeeId)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Attendance</h1>
        <p className="text-slate-400">
          {isAdmin ? 'Mark attendance for any employee.' : 'Mark your own attendance only.'}
        </p>
        {!isAdmin && geofence?.enabled ? (
          <p className="mt-2 rounded-lg border border-blue-900/60 bg-blue-950/30 px-3 py-2 text-sm text-blue-200/90">
            Location check is on: you must be within {geofence.radius_meters} m of the admin location. Your browser
            will ask for a one-time location when you save.
            {geofence.source === 'database'
              ? ' (Anchor saved from admin dashboard.)'
              : geofence.source === 'environment'
                ? ' (Anchor from server environment.)'
                : null}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
        <h2 className="text-lg font-medium text-white">Mark attendance</h2>
        <p className="mt-1 text-sm text-slate-500">Duplicate date for the same employee is rejected.</p>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Employee</label>
            <select
              required
              value={form.employee_id}
              disabled={!isAdmin && !!myEmployeeId}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white disabled:opacity-70"
            >
              <option value="">— Select —</option>
              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_id} — {emp.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              aria-required="true"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Status <span className="text-red-400">*</span>
            </label>
            <select
              required
              aria-required="true"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Check-in time <span className="text-red-400">*</span>
            </label>
            <p className="mb-1 text-[11px] text-slate-500">Uses the attendance date above.</p>
            <input
              type="time"
              step={60}
              value={form.check_in_time}
              onChange={(e) => setForm((f) => ({ ...f, check_in_time: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Check-out time (optional)</label>
            <p className="mb-1 text-[11px] text-slate-500">Uses the attendance date above.</p>
            <input
              type="time"
              step={60}
              value={form.check_out_time}
              onChange={(e) => setForm((f) => ({ ...f, check_out_time: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
        <h2 className="text-lg font-medium text-white">Records</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {isAdmin && (
            <div>
              <label className="mb-1 block text-xs text-slate-400">Employee</label>
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-sm text-white"
              >
                <option value="">All</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.employee_id} — {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-slate-400">From</label>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">To</label>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300"
          >
            Clear
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-slate-400">Loading…</p>
        ) : attendance.length === 0 ? (
          <p className="mt-4 text-slate-500">No records.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Check-in</th>
                  <th className="py-2">Check-out</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((rec) => {
                  const emp = employeeMap[rec.employee_id]
                  const label = emp ? `${emp.employee_id} — ${emp.full_name}` : `#${rec.employee_id}`
                  return (
                    <tr key={rec.id} className="border-b border-slate-800 text-slate-200">
                      <td className="py-2 pr-4">{label}</td>
                      <td className="py-2 pr-4">{rec.date}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            rec.status === 'Present' ? 'text-emerald-400' : 'text-red-400'
                          }
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {formatStoredTime(rec.check_in_time)}
                      </td>
                      <td className="py-2 text-xs text-slate-400">
                        {formatStoredTime(rec.check_out_time)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
