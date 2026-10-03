import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateAuthProfile,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase.js'

// ---------------------------------------------------------------------------
// UserContext = the ONE place that knows who is logged in.
//
//   Firebase Auth      -> who you are (uid, email, password, Google)
//   Firestore users/{uid} -> your profile + your role ("student" | "admin")
//
// Nothing here uses localStorage. The role is read from Firestore, and the
// Firestore Security Rules (firestore.rules) are what actually enforce it.
// ---------------------------------------------------------------------------

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [initializing, setInitializing] = useState(true) // waiting for Firebase Auth's first answer
  // Profile is stored together with the uid it belongs to, so we never show
  // user A's role for a split second after user B logs in.
  const [profileState, setProfileState] = useState({ uid: null, data: null })

  const pendingNameRef = useRef('') // name typed on the signup form
  const creatingRef = useRef(false) // guards against creating the profile twice

  // ------------------------------------------------------------------
  // 1) Firebase Auth session
  // ------------------------------------------------------------------
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      setInitializing(false)
    })
  }, [])

  const uid = firebaseUser?.uid ?? null

  // ------------------------------------------------------------------
  // 2) Live Firestore profile: users/{uid}
  //    (also creates the profile the first time a user signs in)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!uid) return undefined

    const ref = doc(db, 'users', uid)

    return onSnapshot(
      ref,
      (snap) => {
        const fromCache = snap.metadata.fromCache
        if (snap.exists()) {
          setProfileState({ uid, data: snap.data() })
          return
        }

        // Doc not found in the local cache only -> don't create yet, wait
        // for the server's answer so we never overwrite an existing profile.
        if (fromCache) return
        if (creatingRef.current) return
        creatingRef.current = true

        const current = auth.currentUser
        const displayName =
          pendingNameRef.current || current?.displayName || ''
        pendingNameRef.current = ''

        // Every new profile is a student. The Firestore rules reject any
        // attempt to create it with another role.
        setDoc(ref, {
          uid,
          displayName,
          email: current?.email || '',
          photoURL: current?.photoURL || '',
          phone: '',
          address: '',
          role: 'student',
          createdAt: serverTimestamp(),
        })
          .catch((err) => {
            console.error('Could not create user profile:', err)
            setProfileState({ uid, data: null })
          })
          .finally(() => {
            creatingRef.current = false
          })
      },
      (err) => {
        console.error('Could not read user profile:', err)
        setProfileState({ uid, data: null })
      }
    )
  }, [uid])

  const profileReady = uid ? profileState.uid === uid : true
  const profile = uid && profileState.uid === uid ? profileState.data : null

  // "loading" = we don't know yet who this is / what role they have.
  const loading = initializing || !profileReady
  const role = firebaseUser && profileReady ? profile?.role || 'student' : null
  const isAdmin = role === 'admin'

  // Same shape the pages already use: user.name / email / phone / address
  const user = useMemo(() => {
    if (!firebaseUser) return null
    return {
      uid: firebaseUser.uid,
      name: profile?.displayName || firebaseUser.displayName || '',
      email: profile?.email || firebaseUser.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      photoURL: profile?.photoURL || firebaseUser.photoURL || '',
      role,
    }
  }, [firebaseUser, profile, role])

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  const login = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signup = useCallback(async (name, email, password) => {
    pendingNameRef.current = name.trim()
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
      await updateAuthProfile(cred.user, { displayName: name.trim() })
    } catch (err) {
      pendingNameRef.current = ''
      throw err
    }
  }, [])

  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  // Admin login = a normal Firebase Auth login + a role check in Firestore.
  // If the account is not an admin we sign it right back out.
  const adminLogin = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    let isAdminAccount = false
    try {
      const snap = await getDoc(doc(db, 'users', cred.user.uid))
      isAdminAccount = snap.exists() && snap.data().role === 'admin'
    } catch (err) {
      console.error('Admin role check failed:', err)
    }
    if (!isAdminAccount) {
      await signOut(auth)
      throw Object.assign(new Error('not-admin'), { code: 'app/not-admin' })
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  // Only name / phone / address can be changed here. The Firestore rules
  // block changes to `role` and `email` from the client.
  const updateProfile = useCallback(async ({ name, phone, address }) => {
    const current = auth.currentUser
    if (!current) throw new Error('You are not logged in.')

    const changes = { updatedAt: serverTimestamp() }
    if (name !== undefined) changes.displayName = name
    if (phone !== undefined) changes.phone = phone
    if (address !== undefined) changes.address = address

    await updateDoc(doc(db, 'users', current.uid), changes)

    if (name !== undefined && current.displayName !== name) {
      updateAuthProfile(current, { displayName: name }).catch(() => {})
    }
  }, [])

  const value = {
    user,
    firebaseUser,
    role,
    isAdmin,
    isAuthed: !!firebaseUser,
    loading,
    initializing,
    login,
    signup,
    loginWithGoogle,
    adminLogin,
    logout,
    updateProfile,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}
