import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

const emptyEditForm = {
  employee_id: '',
  full_name: '',
  email: '',
  department: '',
}

const emptyCreateAccount = {
  name: '',
  email: '',
  department: '',
}

export default function Employees() {
  const { isAdmin } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyEditForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateAccount)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const [usersOpen, setUsersOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (deptFilter.trim()) params.department = deptFilter.trim()
      const data = await api.employees.list(params)
      setList(data || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, deptFilter])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const data = await api.admin.users()
      setUsers(data || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (usersOpen && isAdmin) loadUsers()
  }, [usersOpen, isAdmin])

  function openEdit(emp) {
    setEditId(emp.id)
    setForm({
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      email: emp.email,
      department: emp.department,
    })
    setEditOpen(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.employees.update(editId, {
        employee_id: form.employee_id.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
      })
      toast.success('Employee updated')
      setEditOpen(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateAccount(e) {
    e.preventDefault()
    setCreateSubmitting(true)
    try {
      const res = await api.admin.createEmployee({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        department: createForm.department.trim(),
      })
      setCreateOpen(false)
      setCreateForm(emptyCreateAccount)
      setCredentials(res)
      toast.success('Account created')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this employee?')) return
    setDeletingId(id)
    try {
      await api.employees.delete(id)
      toast.success('Deleted')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Copy failed')
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Employees</h1>
          <p className="text-slate-400">
            {isAdmin
              ? 'Create login accounts for employees. Edit HR records below.'
              : 'Directory (read-only).'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Create employee account
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-slate-800 bg-[#1a2332]">
          <button
            type="button"
            onClick={() => setUsersOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-800/50"
          >
            System users (accounts)
            <span className="text-slate-500">{usersOpen ? '▲' : '▼'}</span>
          </button>
          {usersOpen && (
            <div className="border-t border-slate-800 p-4">
              {usersLoading ? (
                <p className="text-slate-400">Loading…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2">Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-800 text-slate-200">
                          <td className="py-2 pr-4">{u.id}</td>
                          <td className="py-2 pr-4">{u.name}</td>
                          <td className="py-2 pr-4">{u.email}</td>
                          <td className="py-2 pr-4">{u.role}</td>
                          <td className="py-2">{u.department ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-800 bg-[#1a2332] p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-slate-400">Search name / ID / email</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs text-slate-400">Department</label>
          <input
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {createOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#1a2332] p-6">
            <h2 className="text-lg font-medium text-white">Create employee account</h2>
            <p className="mt-1 text-sm text-slate-400">
              Creates login credentials and an HR profile. A random password is generated once.
            </p>
            <form onSubmit={handleCreateAccount} className="mt-4 space-y-3">
              <input
                required
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
              <input
                required
                type="email"
                placeholder="Email (login)"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
              <input
                required
                placeholder="Department"
                value={createForm.department}
                onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating…' : 'Create account'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-amber-700/50 bg-[#1a2332] p-6">
            <h2 className="text-lg font-semibold text-amber-200">Save these credentials</h2>
            <p className="mt-1 text-sm text-slate-400">
              The password is shown only this once. Share it securely with the employee.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="flex items-center gap-2 font-mono text-white">
                  {credentials.email}
                  <button
                    type="button"
                    onClick={() => copyText(credentials.email)}
                    className="text-blue-400 hover:underline"
                  >
                    Copy
                  </button>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Temporary password</dt>
                <dd className="flex items-center gap-2 font-mono text-emerald-300">
                  {credentials.temporary_password}
                  <button
                    type="button"
                    onClick={() => copyText(credentials.temporary_password)}
                    className="text-blue-400 hover:underline"
                  >
                    Copy
                  </button>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Employee code</dt>
                <dd className="font-mono text-slate-200">{credentials.employee_code}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setCredentials(null)}
              className="mt-6 w-full rounded-lg bg-slate-700 py-2 text-sm text-white hover:bg-slate-600"
            >
              I have saved the password
            </button>
          </div>
        </div>
      )}

      {editOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-[#1a2332] p-6">
            <h2 className="text-lg font-medium text-white">Edit employee record</h2>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <input
                required
                placeholder="Employee ID"
                value={form.employee_id}
                onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
              <input
                required
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
              <input
                required
                placeholder="Department"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-[#0f1419] px-3 py-2 text-white"
              />
              <p className="text-xs text-slate-500">
                Changing email here does not update the login email automatically. Use care for linked accounts.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#1a2332]">
        {loading ? (
          <p className="p-6 text-slate-400">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-slate-500">No employees match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  {isAdmin && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-800 text-slate-200">
                    <td className="px-4 py-3 font-mono text-xs">{emp.employee_id}</td>
                    <td className="px-4 py-3">{emp.full_name}</td>
                    <td className="px-4 py-3">{emp.email}</td>
                    <td className="px-4 py-3">{emp.department}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(emp)}
                            className="text-blue-400 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === emp.id}
                            onClick={() => handleDelete(emp.id)}
                            className="text-red-400 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
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
