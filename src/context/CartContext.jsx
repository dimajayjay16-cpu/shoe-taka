import { createContext, useContext, useEffect, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useProducts } from './ProductsContext.jsx'
import { useUser } from './UserContext.jsx'

// ---------------------------------------------------------------------------
// CART   -> temporary basket, kept in this browser only (one per account, so
//           two people sharing a computer never see each other's cart).
// ORDERS -> Firestore: orders/{orderId}
//           - a user only ever reads their OWN orders
//           - an admin reads ALL orders and changes their status
//           (enforced in firestore.rules)
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled']

const CART_KEY_PREFIX = 'shoeTakaCart:'
const cartKeyFor = (uid) => `${CART_KEY_PREFIX}${uid || 'guest'}`

const CartContext = createContext(null)

// Cart entries are keyed as `${productId}::${size}` so the same shoe can sit
// in the cart more than once, in different sizes.
export function parseCartKey(cartKey) {
  const [productId, size] = cartKey.split('::')
  return { productId, size }
}

function makeCartKey(productId, size) {
  return `${productId}::${size}`
}

function readCart(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

// Firestore document -> plain order object the pages can render.
function fromOrderDoc(d) {
  const data = d.data({ serverTimestamps: 'estimate' })
  return {
    ...data,
    id: d.id,
    placedAt: data.placedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  }
}

const byNewest = (a, b) =>
  new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()

export function CartProvider({ children }) {
  const { products: PRODUCTS } = useProducts()
  const { firebaseUser, isAdmin } = useUser()
  const uid = firebaseUser?.uid ?? null

  // ---------------- Cart (per account) ----------------
  const [cart, setCart] = useState({})
  const [loadedCartKey, setLoadedCartKey] = useState(null)
  const currentCartKey = cartKeyFor(uid)

  // Load the right cart whenever the logged-in account changes. Anything a
  // visitor added before logging in is merged into their account cart.
  useEffect(() => {
    let loaded = readCart(currentCartKey)

    if (uid) {
      const guestKey = cartKeyFor(null)
      const guest = readCart(guestKey)
      if (Object.keys(guest).length > 0) {
        loaded = { ...loaded }
        for (const [key, qty] of Object.entries(guest)) {
          loaded[key] = (loaded[key] || 0) + qty
        }
        localStorage.removeItem(guestKey)
        // Save the merged cart right away so nothing is lost if this
        // effect runs again before the normal save below.
        localStorage.setItem(currentCartKey, JSON.stringify(loaded))
      }
    }

    setCart(loaded)
    setLoadedCartKey(currentCartKey)
  }, [currentCartKey, uid])

  // Save the cart, but only once it belongs to the current account.
  useEffect(() => {
    if (loadedCartKey !== currentCartKey) return
    localStorage.setItem(currentCartKey, JSON.stringify(cart))
  }, [cart, loadedCartKey, currentCartKey])

  // ---------------- Orders (Firestore) ----------------
  // Stored together with the uid they belong to, so one account's orders
  // are never shown to the next account that logs in.
  const [ownState, setOwnState] = useState({ uid: null, list: [] })
  const [allState, setAllState] = useState({ uid: null, list: [] })
  const [ordersError, setOrdersError] = useState('')
  const [hasNewOrder, setHasNewOrder] = useState(false)

  // The logged-in user's own orders
  useEffect(() => {
    if (!uid) return undefined
    const q = query(collection(db, 'orders'), where('userId', '==', uid))
    return onSnapshot(
      q,
      (snap) => {
        setOwnState({ uid, list: snap.docs.map(fromOrderDoc).sort(byNewest) })
        setOrdersError('')
      },
      (err) => {
        console.error('Could not load your orders:', err)
        setOrdersError('Could not load your orders.')
      }
    )
  }, [uid])

  // ALL orders - only subscribed for admins
  useEffect(() => {
    if (!uid || !isAdmin) return undefined
    const q = query(collection(db, 'orders'), orderBy('placedAt', 'desc'))
    return onSnapshot(
      q,
      (snap) => {
        setAllState({ uid, list: snap.docs.map(fromOrderDoc) })
        setOrdersError('')
      },
      (err) => {
        console.error('Could not load all orders:', err)
        setOrdersError('Could not load orders.')
      }
    )
  }, [uid, isAdmin])

  const orders = uid && ownState.uid === uid ? ownState.list : []
  const allOrders = uid && isAdmin && allState.uid === uid ? allState.list : []

  // ---------------- Cart actions ----------------
  function addToCart(productId, size) {
    const cartKey = makeCartKey(productId, size)
    setCart((prev) => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + 1 }))
  }

  function changeQuantity(cartKey, delta) {
    setCart((prev) => {
      const newQty = (prev[cartKey] || 0) + delta
      const updated = { ...prev }
      if (newQty <= 0) {
        delete updated[cartKey]
      } else {
        updated[cartKey] = newQty
      }
      return updated
    })
  }

  function removeFromCart(cartKey) {
    setCart((prev) => {
      const updated = { ...prev }
      delete updated[cartKey]
      return updated
    })
  }

  function clearCart() {
    setCart({})
  }

  // ---------------- Order actions ----------------

  // Turns the current cart into an order document in Firestore.
  // Returns the created order, or null if the cart was empty.
  // Throws if the write fails (Cart.jsx shows the message).
  async function placeOrder(buyer, paymentMethod) {
    if (!uid) throw new Error('Please log in to place an order.')

    const items = Object.entries(cart)
      .map(([cartKey, qty]) => {
        const { productId, size } = parseCartKey(cartKey)
        const product = PRODUCTS.find((p) => p.id === productId)
        if (!product) return null
        // Snapshot of the product at the time of purchase, so later price
        // changes or deleted products never rewrite order history.
        return {
          id: cartKey,
          productId,
          name: product.name,
          img: product.image,
          price: product.priceValue,
          size,
          qty,
        }
      })
      .filter(Boolean)

    if (items.length === 0) return null

    const ref = doc(collection(db, 'orders'))
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

    await setDoc(ref, {
      userId: uid,
      userEmail: firebaseUser.email || '',
      orderNumber: `ORD-${ref.id.slice(0, 6).toUpperCase()}`,
      status: 'Processing',
      items,
      total,
      buyer,
      paymentMethod,
      placedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    setHasNewOrder(true)
    clearCart()
    return { id: ref.id, total }
  }

  function markOrdersSeen() {
    setHasNewOrder(false)
  }

  // A customer can cancel their own order while it is still "Processing".
  // The order is kept (status becomes "Cancelled") so there's a record.
  async function cancelOrder(orderId) {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'Cancelled',
      updatedAt: serverTimestamp(),
    })
  }

  // Admin only (Firestore rules reject everyone else).
  async function setOrderStatus(orderId, status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}`)
    }
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    })
  }

  // Admin only.
  async function deleteOrder(orderId) {
    await deleteDoc(doc(db, 'orders', orderId))
  }

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)

  const cartTotal = Object.entries(cart).reduce((sum, [cartKey, qty]) => {
    const { productId } = parseCartKey(cartKey)
    const product = PRODUCTS.find((p) => p.id === productId)
    return sum + (product ? product.priceValue * qty : 0)
  }, 0)

  const value = {
    cart,
    addToCart,
    changeQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    orders,
    allOrders,
    ordersError,
    placeOrder,
    markOrdersSeen,
    cancelOrder,
    setOrderStatus,
    deleteOrder,
    hasNewOrder,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
