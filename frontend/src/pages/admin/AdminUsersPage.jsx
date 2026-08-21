import { useEffect, useState } from 'react';
import { getStats, listUsers, updateUser, deleteUser } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { UsersIcon, SearchIcon, TrashIcon, LogoutIcon, BoxIcon, SparkleIcon, ClipboardIcon } from '../../components/icons';
import '../../styles/admin.css';

const LIMIT = 20;

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

export default function AdminUsersPage() {
  const { user: me, logout } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getStats({ signal: controller.signal })
      .then(setStats)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    listUsers({ page, limit: LIMIT, search, signal: controller.signal })
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [page, search]);

  async function handleUpdate(id, patch) {
    setSavingId(id);
    setError('');
    try {
      const updated = await updateUser(id, patch);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, ...updated } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId('');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget._id);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const loading = users === null && !error;
  const empty = users !== null && users.length === 0;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          Affi<span>Mate</span>
        </div>
        <button className="admin-nav-item active" type="button">
          <UsersIcon />
          <span className="label">Người dùng</span>
        </button>
        <div className="admin-sidebar-footer">
          <div className="admin-user-chip">
            <span className="admin-user-avatar">{initials(me?.name)}</span>
            <span>
              <span className="name">{me?.name}</span>
              <span className="email">{me?.email}</span>
            </span>
          </div>
          <button className="admin-nav-item" type="button" onClick={logout}>
            <LogoutIcon />
            <span className="label">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1>Quản lý người dùng</h1>
            <p>Tổng quan hệ thống và danh sách toàn bộ người dùng đã đăng ký.</p>
          </div>
        </div>

        {error && (
          <div className="error-banner" role="alert" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        {stats && (
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-icon">
                <UsersIcon />
              </span>
              <span className="stat-value">{stats.totalUsers}</span>
              <span className="stat-label">Tổng người dùng</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">
                <UsersIcon />
              </span>
              <span className="stat-value">{stats.adminUsers}</span>
              <span className="stat-label">Quản trị viên</span>
            </div>
            <div className="stat-card stat-warn">
              <span className="stat-icon">
                <UsersIcon />
              </span>
              <span className="stat-value">{stats.bannedUsers}</span>
              <span className="stat-label">Đã khoá</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">
                <BoxIcon />
              </span>
              <span className="stat-value">{stats.totalProducts}</span>
              <span className="stat-label">Sản phẩm</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">
                <SparkleIcon />
              </span>
              <span className="stat-value">{stats.totalGeneratedImages}</span>
              <span className="stat-label">Lượt tạo ảnh AI</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">
                <ClipboardIcon />
              </span>
              <span className="stat-value">{stats.totalGeneratedContents}</span>
              <span className="stat-label">Lượt tạo nội dung AI</span>
            </div>
          </div>
        )}

        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách người dùng</h2>
            <div className="admin-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Tìm người dùng"
              />
            </div>
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div className="spinner" />
            </div>
          )}

          {empty && <div className="admin-empty">Không tìm thấy người dùng nào phù hợp.</div>}

          {users && users.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u._id === me?.id;
                    const savingThis = savingId === u._id;
                    return (
                      <tr key={u._id}>
                        <td>
                          <div className="admin-name-cell">
                            <span className="admin-user-avatar">{initials(u.name)}</span>
                            <span>
                              <b>
                                {u.name} {isSelf && '(bạn)'}
                              </b>
                              <span>{u.email}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <select
                            className="admin-select"
                            value={u.role}
                            disabled={isSelf || savingThis}
                            onChange={(e) => handleUpdate(u._id, { role: e.target.value })}
                            aria-label={`Vai trò của ${u.name}`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="admin-select"
                            value={u.status}
                            disabled={isSelf || savingThis}
                            onChange={(e) => handleUpdate(u._id, { status: e.target.value })}
                            aria-label={`Trạng thái của ${u.name}`}
                          >
                            <option value="active">Hoạt động</option>
                            <option value="banned">Đã khoá</option>
                          </select>
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              className="admin-icon-btn"
                              aria-label={`Xoá ${u.name}`}
                              disabled={isSelf}
                              onClick={() => setDeleteTarget(u)}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {users && total > 0 && (
            <div className="admin-panel-foot">
              <span className="hint">
                {total} người dùng · Trang {page}/{totalPages}
              </span>
              <div className="admin-pagination">
                <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ‹
                </button>
                <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá người dùng này?"
        message={`Tài khoản "${deleteTarget?.name}" (${deleteTarget?.email}) sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá người dùng"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
