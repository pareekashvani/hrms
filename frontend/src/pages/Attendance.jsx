import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

function toIsoLocal(dtLocal) {
  if (!dtLocal) return null
  const d = new Date(dtLocal)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.employee_id) {
      toast.error('Select an employee')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        employee_id: Number(form.employee_id),
        date: form.date,
        status: form.status,
        check_in_time: toIsoLocal(form.check_in_time),
        check_out_time: toIsoLocal(form.check_out_time),
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
            <label className="mb-1 block text-xs text-slate-400">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Check-in (optional)</label>
            <input
              type="datetime-local"
              value={form.check_in_time}
              onChange={(e) => setForm((f) => ({ ...f, check_in_time: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Check-out (optional)</label>
            <input
              type="datetime-local"
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
                        {rec.check_in_time
                          ? new Date(rec.check_in_time).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-2 text-xs text-slate-400">
                        {rec.check_out_time
                          ? new Date(rec.check_out_time).toLocaleString()
                          : '—'}
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
