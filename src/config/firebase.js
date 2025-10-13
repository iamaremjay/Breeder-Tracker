import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, inMemoryPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCjFX56vIa2gHLWS-QngMhbcZI-S14u2do",
    authDomain: "default-bloodline-tracker.web.app",
    projectId: "default-bloodline-tracker",
    storageBucket: "default-bloodline-tracker.firebasestorage.app",
    messagingSenderId: "462873261927",
    appId: "1:462873261927:web:16d4c7be43642obe3f21c2",
    measurementId: "G-6DP32VCVLJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Detect if running in an in-app browser
const isInAppBrowser = () => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return (
        ua.includes('FBAN') ||
        ua.includes('FBAV') ||
        ua.includes('Instagram') ||
        ua.includes('Messenger') ||
        ua.includes('Twitter') ||
        ua.includes('Line')
    );
};

// Use appropriate persistence based on browser type
const persistenceMode = isInAppBrowser() ? inMemoryPersistence : browserLocalPersistence;

setPersistence(auth, persistenceMode)
    .then(() => {
        console.log(`Auth persistence: ${isInAppBrowser() ? 'in-memory (FB Messenger)' : 'local (regular browser)'}`);
    })
    .catch((err) => {
        console.error("Persistence error:", err);
        return setPersistence(auth, inMemoryPersistence);
    });

export { auth, db, storage };