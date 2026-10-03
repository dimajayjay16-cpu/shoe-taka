import { createContext, useContext, useEffect, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { PRODUCTS as SEED_PRODUCTS } from '../data/products.js'

// ---------------------------------------------------------------------------
// Products live in Firestore: products/{productId}
//   - everyone can read (the store is public)
//   - only admins can add / edit / delete (enforced in firestore.rules)
// ---------------------------------------------------------------------------

const ProductsContext = createContext(null)

function makeId(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${slug || 'shoe'}-${Date.now().toString(36)}`
}

// Turns a Firestore document into the shape the pages already use.
function fromDoc(id, data) {
  return {
    id,
    name: data.name || '',
    brand: data.brand || '',
    code: data.code || '',
    priceValue: Number(data.priceValue) || 0,
    image: data.image || '/items/samba.avif',
    size: Array.isArray(data.size) ? data.size.map(String) : [],
    createdAtMs: data.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER,
  }
}

// Only these fields are ever written to Firestore.
function toDocData(data) {
  return {
    name: String(data.name || 'Untitled Shoe').trim(),
    brand: String(data.brand || '').trim().toUpperCase(),
    code: String(
      data.code || (data.brand || '').slice(0, 3)
    )
      .trim()
      .toUpperCase(),
    priceValue: Number(data.priceValue) || 0,
    image: String(data.image || '/items/samba.avif').trim(),
    size:
      Array.isArray(data.size) && data.size.length > 0
        ? data.size.map(String)
        : ['7', '8', '9', '10'],
  }
}

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    return onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const list = snap.docs
          .map((d) => fromDoc(d.id, d.data({ serverTimestamps: 'estimate' })))
          .sort(
            (a, b) =>
              a.createdAtMs - b.createdAtMs || a.name.localeCompare(b.name)
          )
        setProducts(list)
        setError('')
        setLoading(false)
      },
      (err) => {
        console.error('Could not load products:', err)
        setError('Could not load products. Please try again later.')
        setLoading(false)
      }
    )
  }, [])

  // Accepts { name, brand, code, priceValue, image, size }
  async function addProduct(data) {
    const id = makeId(data.name || 'shoe')
    await setDoc(doc(db, 'products', id), {
      ...toDocData(data),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return id
  }

  async function updateProduct(id, updates) {
    await updateDoc(doc(db, 'products', id), {
      ...toDocData(updates),
      updatedAt: serverTimestamp(),
    })
  }

  async function deleteProduct(id) {
    await deleteDoc(doc(db, 'products', id))
  }

  // Admin helper: copies the starter shoes from src/data/products.js into
  // Firestore. Products that already exist are skipped, so it never
  // overwrites edits. Returns how many were added.
  async function seedProducts() {
    const existing = new Set(products.map((p) => p.id))
    const missing = SEED_PRODUCTS.filter((p) => !existing.has(p.id))
    if (missing.length === 0) return 0

    const batch = writeBatch(db)
    const base = Date.now()
    missing.forEach((p, i) => {
      batch.set(doc(db, 'products', p.id), {
        ...toDocData(p),
        createdAt: Timestamp.fromMillis(base + i),
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
    return missing.length
  }

  const value = {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    seedProducts,
  }

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  return useContext(ProductsContext)
}
