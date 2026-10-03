import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { money } from './data/products.js'
import { useCart } from './context/CartContext.jsx'
import Nav from './components/Nav.jsx'

const STATUS_BADGE = {
  Processing: 'bg-warning-subtle text-dark',
  Shipped: 'bg-info-subtle text-dark',
  Delivered: 'bg-success-subtle text-dark',
  Cancelled: 'bg-danger-subtle text-dark',
}

// "My Orders" - Firestore only returns orders that belong to the logged-in
// user, and the security rules block reading anyone else's.
function Orders() {
  const { orders, ordersError, markOrdersSeen, cancelOrder } = useCart()
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    // Only mark orders as seen once, when this page is opened.
    markOrdersSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCancel(orderId) {
    if (!window.confirm('Cancel this order?')) return
    setActionError('')
    try {
      await cancelOrder(orderId)
    } catch (err) {
      console.error('Cancel failed:', err)
      setActionError(
        'Could not cancel this order. It may already be on its way.'
      )
    }
  }

  return (
    <div className="bg-light app-page">
      <Nav />

      <nav className="navbar navbar-light bg-white border-bottom">
        <div className="container d-flex align-items-center">
          <Link to="/dashboard" className="text-dark text-decoration-none me-3">
            <i className="bi bi-arrow-left fs-5"></i>
          </Link>
          <span className="navbar-brand mb-0">My Orders</span>
        </div>
      </nav>

      {(ordersError || actionError) && (
        <div className="container mt-3">
          <div className="alert alert-danger py-2 mb-0">
            {actionError || ordersError}
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="container mt-5 text-center text-muted py-5">
          <i className="bi bi-clock-history display-4 d-block mb-3"></i>
          <p>No orders yet. Once you check out, your orders will show up here.</p>
        </div>
      ) : (
        <div className="container mt-4">
          {orders.map((order) => (
            <div key={order.id} className="card shadow-sm mb-3">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <span className="small text-muted">
                  {order.orderNumber ? `${order.orderNumber} · ` : ''}
                  {new Date(order.placedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={`badge ${STATUS_BADGE[order.status] || 'bg-secondary-subtle text-dark'}`}>
                  {order.status}
                </span>
              </div>
              <div className="card-body">
                {order.items.map((item) => (
                  <div key={item.id} className="d-flex align-items-center gap-3 py-2 border-bottom">
                    <img src={item.img} alt={item.name} className="rounded" style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                    <div className="flex-grow-1">
                      <div className="fw-semibold small">{item.name}</div>
                      <div className="text-muted small">
                        {item.size ? `Size ${item.size} · ` : ''}x{item.qty}
                      </div>
                    </div>
                    <div className="fw-semibold small">{money(item.price * item.qty)}</div>
                  </div>
                ))}

                <div className="d-flex justify-content-between fw-bold mt-3">
                  <span>Order Total</span>
                  <span>{money(order.total)}</span>
                </div>

                <div className="mt-3 pt-3 border-top small text-secondary">
                  <div><i className="bi bi-person-fill me-2"></i>{order.buyer?.name}</div>
                  <div><i className="bi bi-geo-alt-fill me-2"></i>{order.buyer?.address}</div>
                  <div><i className="bi bi-telephone-fill me-2"></i>{order.buyer?.contactNumber}</div>
                  <div><i className="bi bi-wallet2 me-2"></i>{order.paymentMethod}</div>
                </div>

                {order.status === 'Processing' && (
                  <button
                    className="btn btn-outline-danger btn-sm w-100 mt-3"
                    onClick={() => handleCancel(order.id)}
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders
