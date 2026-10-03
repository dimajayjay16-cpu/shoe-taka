
import { Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { CartProvider } from './context/CartContext.jsx'


import RequireAuth from './components/RequireAuth.jsx'
import RequireAdminAuth from './components/RequireAdminAuth.jsx'
import FullPageLoader from './components/FullPageLoader.jsx'

import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Store from './pages/Store.jsx'
import Cart from './pages/Cart.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import Orders from './Orders.jsx'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'


function GuestOnly({ children, adminPage = false, waitForRole = false }) {
  const { initializing, loading, firebaseUser, isAdmin } = useUser()

  // Still asking Firebase whether someone is logged in
  if (initializing) return <FullPageLoader />

  // Logged in, but role not known yet
  if (firebaseUser && loading) {
    return waitForRole ? <FullPageLoader /> : children
  }

  if (firebaseUser) {
    if (isAdmin) return <Navigate to="/admin" replace />
    // A normal user opening /admin/login stays on the admin login page
    // (it tells them they need an admin account) instead of being bounced.
    if (!adminPage) return <Navigate to="/store" replace />
  }

  return children
}
function App() {
  return (
    <UserProvider>
      <ProductsProvider>
        <CartProvider>
          <Routes>
            {/* Public */}
           <Route path="/" element={<Home />} />
            
            <Route path="/home" element={<Home />} />
            <Route path="/store" element={<Store />} />
            <Route path="/products" element={<Store />} />
            {/* Login / signup */}
            <Route
              path="/login"
              element={
                <GuestOnly>
                  <Login initialMode="login" />
                </GuestOnly>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestOnly>
                  <Login initialMode="signup" />
                </GuestOnly>
              }
            />

            {/* Logged-in users */}
            <Route
              path="/cart"
              element={
                <RequireAuth>
                  <Cart />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardOrAdmin />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <Orders />
                </RequireAuth>
              }
            />
            {/* Old /Orders links */}
            <Route path="/Orders" element={<Navigate to="/orders" replace />} />

            {/* Admin */}
            <Route
              path="/admin/login"
              element={
                <GuestOnly adminPage>
                  <AdminLogin />
                </GuestOnly>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdminAuth>
                  <AdminLayout />
                </RequireAdminAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </ProductsProvider>
    </UserProvider>
  )
}

// Admins use the admin panel instead of the customer dashboard.
function DashboardOrAdmin() {
  const { isAdmin } = useUser()
  return isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />
}

export default App
