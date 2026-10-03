import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'

function AdminLayout() {
  const navigate = useNavigate()
  const { logout } = useUser()

  async function handleLogout() {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <span className="admin-topbar-icon">
            <i className="bi bi-bag-fill"></i>
          </span>
          Shoe Taka - Admin
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-title">Admin Panel</div>
          <nav className="admin-nav">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-speedometer2"></i>
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/products"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-box-seam"></i>
              Product Management
            </NavLink>
            <NavLink
              to="/admin/orders"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-clipboard-check"></i>
              Order Management
            </NavLink>
          </nav>

          <button className="admin-logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i>
            Log out
          </button>
        </aside>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
