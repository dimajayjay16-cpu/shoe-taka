import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'


function Nav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartCount, hasNewOrder } = useCart()
  const { user, logout } = useUser()

  function isActive(path) {
    return location.pathname === path
  }

 async function handleLogout() {
  await logout()
  navigate('/home', { replace: true })
}
  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : '?'

  return (
    <nav className="nav">
      <div className="nav-logo">
        <span className="dot"></span>
        Shoe Taka
      </div>

      <div className="nav-links">
        
        <Link to="/store" className={`nav-btn ${isActive('/store') ? 'active-view' : ''}`}>
          Store
        </Link>
        <Link to="/dashboard" className={`nav-btn ${isActive('/dashboard') ? 'active-view' : ''}`}>
          Dashboard
        </Link>
        <Link to="/orders" className={`nav-btn ${isActive('/orders') ? 'active-view' : ''}`}>
          Orders
          {hasNewOrder && <span className="cart-count">!</span>}
        </Link>
        <Link to="/cart" className="nav-btn cart-pill">
          Cart
          <span className="cart-count">{cartCount}</span>
        </Link>
        <Link to="/profile" className={`nav-avatar ${isActive('/profile') ? 'active-view' : ''}`} title={user?.name || 'Profile'}>
          {initial}
        </Link>
        <button className="nav-out" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </nav>
  )
}

export default Nav
