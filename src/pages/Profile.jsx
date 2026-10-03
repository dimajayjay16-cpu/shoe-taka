import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import Nav from '../components/Nav.jsx'

function Profile() {
  const { user, updateProfile } = useUser()
  const { orders, cartCount } = useCart()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Load the current profile into the editable fields whenever it changes
  // (e.g. right after logging in).
  useEffect(() => {
    setName(user?.name || '')
    setPhone(user?.phone || '')
    setAddress(user?.address || '')
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    setSaveError('')
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim(), address: address.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Could not save profile:', err)
      setSaveError('Could not save your profile. Please try again.')
    }
  }

  const initial = name ? name.trim().charAt(0).toUpperCase() : '?'

  return (
    <div className="app active">
      <Nav />

      <main className="store-wrap">
        <div className="store-head">
          <h1>My Profile</h1>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <div className="stat-card text-center">
              <div className="shoe-login-logo mx-auto mb-3" style={{ width: 64, height: 64, fontSize: '1.8rem' }}>
                {initial}
              </div>
              <div className="fw-bold fs-5">{name || 'No name set'}</div>
              <div className="text-muted small mb-3">{user?.email}</div>
              <hr />
              <div className="d-flex justify-content-around">
                <div>
                  <div className="stat-value">{orders.length}</div>
                  <div className="stat-label">Orders</div>
                </div>
                <div>
                  <div className="stat-value">{cartCount}</div>
                  <div className="stat-label">In Cart</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-8">
            <div className="login-card" style={{ maxWidth: 'none', padding: 32 }}>
              <h2 className="section-title h5 mb-3">Account Details</h2>
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label htmlFor="profile-name" className="form-label">Full Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    className="form-control"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="profile-email" className="form-label">Email Address</label>
                  <input
                    id="profile-email"
                    type="email"
                    className="form-control"
                    value={user?.email || ''}
                    disabled
                    readOnly
                  />
                  <div className="form-text">Email is tied to your account and can't be changed here.</div>
                </div>
                <div className="mb-3">
                  <label htmlFor="profile-phone" className="form-label">Contact Number</label>
                  <input
                    id="profile-phone"
                    type="text"
                    className="form-control"
                    placeholder="Enter your contact number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="profile-address" className="form-label">Delivery Address</label>
                  <textarea
                    id="profile-address"
                    className="form-control"
                    placeholder="Enter your default delivery address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <div className="form-text">This will be used to pre-fill checkout on the Cart page.</div>
                </div>

                {saved && <div className="text-success small mb-3">Profile saved!</div>}
                {saveError && <div className="text-danger small mb-3">{saveError}</div>}

                <button type="submit" className="btn shoe-btn-yellow py-2 px-4">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Profile
