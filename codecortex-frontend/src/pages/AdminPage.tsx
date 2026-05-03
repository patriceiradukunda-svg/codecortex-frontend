import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { adminApi } from '@/services/api'
import { AdminStats, User, PaginatedResponse } from '@/types'
import { Users, MessageSquare, Activity, Brain, Search, Trash2, Shield, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function AdminPage() {
  const { isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'overview' | 'users' | 'chats'>('overview')
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/')
  }, [isAdmin, loading])

  useEffect(() => {
    if (isAdmin) {
      setFetching(true)
      Promise.all([adminApi.stats(), adminApi.users()])
        .then(([s, u]) => { setStats(s.data); setUsers(u.data) })
        .catch(() => toast.error('Failed to load admin data'))
        .finally(() => setFetching(false))
    }
  }, [isAdmin])

  const handleSearch = async () => {
    const { data } = await adminApi.users(1, 20, search)
    setUsers(data)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return
    await adminApi.deleteUser(id)
    setUsers(prev => prev ? { ...prev, items: prev.items.filter(u => u.id !== id) } : prev)
    toast.success('User deleted')
  }

  const handlePromote = async (id: string) => {
    await adminApi.promoteUser(id)
    setUsers(prev => prev ? {
      ...prev, items: prev.items.map(u => u.id === id ? { ...u, role: 'admin' } : u)
    } : prev)
    toast.success('User promoted to admin')
  }

  if (loading || fetching) return (
    <div className="h-screen flex items-center justify-center bg-[#121212]">
      <Loader2 size={32} className="animate-spin text-choco-light" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header */}
      <div className="bg-sidebar border-b border-border px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-choco-light" />
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'users', 'chats'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all
                ${tab === t ? 'bg-choco text-white' : 'bg-card text-gray-400 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: <Users size={22} />, label: 'Total Users', value: stats.totalUsers, color: 'text-blue-400' },
                { icon: <MessageSquare size={22} />, label: 'Total Chats', value: stats.totalChats, color: 'text-green-400' },
                { icon: <Activity size={22} />, label: 'Total Messages', value: stats.totalMessages, color: 'text-amber-400' },
                { icon: <Brain size={22} />, label: 'Active Today', value: stats.activeToday, color: 'text-choco-light' },
              ].map(s => (
                <div key={s.label} className="card-dark p-5">
                  <div className={`${s.color} mb-3`}>{s.icon}</div>
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card-dark p-5">
                <h3 className="font-semibold text-sm mb-4">Popular Devices</h3>
                <div className="space-y-2">
                  {stats.popularDevices.map(d => (
                    <div key={d.device} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{d.device}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-choco/20 rounded-full w-24 overflow-hidden">
                          <div
                            className="h-full bg-choco-light rounded-full"
                            style={{ width: `${(d.count / (stats.popularDevices[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{d.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-dark p-5">
                <h3 className="font-semibold text-sm mb-4">Recent Users</h3>
                <div className="space-y-2">
                  {stats.recentUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-choco/20 flex items-center justify-center text-xs text-choco-light font-bold">
                        {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{u.name || u.email}</p>
                        <p className="text-[10px] text-gray-600">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</p>
                      </div>
                      <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full
                        ${u.role === 'admin' ? 'bg-choco/20 text-choco-light' : 'bg-border text-gray-500'}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="input-dark pl-8"
                  placeholder="Search users by email or name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button onClick={handleSearch} className="btn-choco px-4 py-2 text-sm">Search</button>
            </div>

            <div className="card-dark overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs text-gray-500">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Joined</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.items.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-choco/20 flex items-center justify-center text-xs text-choco-light font-bold">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-medium">{u.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          ${u.role === 'admin' ? 'bg-choco/20 text-choco-light' : 'bg-border text-gray-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handlePromote(u.id)}
                              className="p-1.5 text-gray-500 hover:text-choco-light transition-colors"
                              title="Promote to admin"
                            >
                              <Shield size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users && (
                <div className="px-4 py-3 border-t border-border text-xs text-gray-500">
                  Showing {users.items.length} of {users.total} users
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
