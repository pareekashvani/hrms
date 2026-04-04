import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function Leaves() {
  const { isAdmin } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    from_date: '',
    to_date: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const data = await api.leaves.list(params)
      setList(data || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  async function handleApply(e) {
    e.preventDefault()
    if (!form.from_date || !form.to_date || !form.reason.trim()) {
      toast.error('Fill all fields')
      return
    }
    setSubmitting(true)
    try {
      await api.leaves.apply({
        from_date: form.from_date,
        to_date: form.to_date,
        reason: form.reason.trim(),
      })
      toast.success('Leave request submitted')
      setForm({ from_date: '', to_date: '', reason: '' })
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatus(id, status) {
    try {
      await api.leaves.setStatus(id, status)
      toast.success(`Leave ${status.toLowerCase()}`)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Leaves</h1>
        <p className="text-slate-400">
          {isAdmin ? 'Review all requests.' : 'Apply and track your leave.'}
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
          <h2 className="text-lg font-medium text-white">Apply for leave</h2>
          <form onSubmit={handleApply} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">From</label>
              <input
                type="date"
                required
                value={form.from_date}
                onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">To</label>
              <input
                type="date"
                required
                value={form.to_date}
                onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Reason</label>
              <textarea
                required
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-[#1a2332] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-white">
            {isAdmin ? 'All requests' : 'My history'}
          </h2>
          {isAdmin && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-sm text-white"
            >
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          )}
        </div>

        {loading ? (
          <p className="mt-4 text-slate-400">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-4 text-slate-500">No leave records.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  {isAdmin && <th className="py-2 pr-4">Employee</th>}
                  <th className="py-2 pr-4">From</th>
                  <th className="py-2 pr-4">To</th>
                  <th className="py-2 pr-4">Reason</th>
                  <th className="py-2 pr-4">Status</th>
                  {isAdmin && <th className="py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800 text-slate-200">
                    {isAdmin && (
                      <td className="py-2 pr-4">
                        {row.employee_full_name || '—'}
                        <div className="text-xs text-slate-500">
                          {row.employee_employee_id} · {row.employee_department}
                        </div>
                      </td>
                    )}
                    <td className="py-2 pr-4">{row.from_date}</td>
                    <td className="py-2 pr-4">{row.to_date}</td>
                    <td className="max-w-xs truncate py-2 pr-4" title={row.reason}>
                      {row.reason}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          row.status === 'Approved'
                            ? 'text-emerald-400'
                            : row.status === 'Rejected'
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-2">
                        {row.status === 'Pending' ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatus(row.id, 'Approved')}
                              className="text-sm text-emerald-400 hover:underline"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatus(row.id, 'Rejected')}
                              className="text-sm text-red-400 hover:underline"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
