import { money } from '../data/products.js'
import { useCart, parseCartKey } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import Nav from '../components/Nav.jsx'


function Dashboard() {
  const { cart, cartCount, cartTotal } = useCart()
  const { user } = useUser()
  const { products: PRODUCTS } = useProducts()

  const brandTotals = ['NIKE', 'ADIDAS', 'PUMA'].map((brand) => {
    const items = PRODUCTS.filter((p) => p.brand === brand)
    const inCart = Object.entries(cart).reduce((sum, [cartKey, qty]) => {
      const { productId } = parseCartKey(cartKey)
      const p = PRODUCTS.find((prod) => prod.id === productId)
      return p && p.brand === brand ? sum + qty : sum
    }, 0)
    return { brand, styleCount: items.length, inCart }
  })

  return (
    <div className="app active">
      <Nav />

      <main className="store-wrap">
        <div className="store-head">
          <h1>Dashboard</h1>
          {user?.name && <p className="text-muted mb-0">Welcome back, {user.name}!</p>}
        </div>

        <div className="row g-3 mb-5">
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">{PRODUCTS.length}</div>
              <div className="stat-label">Total Styles</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">{cartCount}</div>
              <div className="stat-label">Items in Cart</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">{money(cartTotal)}</div>
              <div className="stat-label">Cart Value</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">3</div>
              <div className="stat-label">Brands Carried</div>
            </div>
          </div>
        </div>

        <h2 className="section-title h5">By Brand</h2>
        <div className="row g-3">
          {brandTotals.map((b) => (
            <div className="col-12 col-md-4" key={b.brand}>
              <div className="stat-card text-start">
                <div className="brand-code mb-2">{b.brand}</div>
                <div>{b.styleCount} styles in store</div>
                <div className="text-muted small mt-1">{b.inCart} in your current cart</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
