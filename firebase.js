// === FIREBASE CONFIGURATION ===
// Configuración centralizada de Firebase para SUSTORE

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import {
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc,
    where, writeBatch, getDoc, increment, setDoc, arrayUnion, arrayRemove, orderBy, limit, startAfter
} from 'firebase/firestore';

// --- CREDENCIALES FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAfllte-D_I3h3TwBaiSL4KVfWrCSVh9ro",
    authDomain: "sustore-63266.firebaseapp.com",
    projectId: "sustore-63266",
    storageBucket: "sustore-63266.firebasestorage.app",
    messagingSenderId: "684651914850",
    appId: "1:684651914850:web:f3df09e5caf6e50e9e533b",
    measurementId: "G-X3K7XGYPRD"
};

// --- INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- CONSTANTES GLOBALES ---
const appId = "sustore-prod-v3";
const SUPER_ADMIN_EMAIL = "lautarocorazza63@gmail.com";

// Configuración por defecto extendida para evitar fallos
const defaultSettings = {
    storeName: "SUSTORE",
    primaryColor: "#06b6d4",
    currency: "$",
    admins: SUPER_ADMIN_EMAIL,
    team: [{ email: SUPER_ADMIN_EMAIL, role: "admin", name: "Lautaro Corazza" }],
    sellerEmail: "sustoresf@gmail.com",
    instagramUser: "sustore_sf",
    whatsappLink: "https://wa.me/message/3MU36VTEKINKP1",
    logoUrl: "",
    heroUrl: "",
    markupPercentage: 0,
    announcementMessage: "🔥 ENVÍOS GRATIS EN COMPRAS SUPERIORES A $50.000 🔥",
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming"],
    aboutUsText: "Somos una empresa dedicada a traer la mejor tecnología al mejor precio del mercado.\n\nContamos con garantía oficial en todos nuestros productos y soporte personalizado."
};

// --- HELPERS DE BASE DE DATOS ---

// Referencia a colección de datos
const getDataCollection = (collectionName) => {
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
};

// Referencia a documento específico
const getDataDoc = (collectionName, docId) => {
    return doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId);
};

// Query paginada para productos
const getPaginatedQuery = (collectionName, orderField = 'name', pageSize = 20, lastDoc = null) => {
    const baseQuery = [
        getDataCollection(collectionName),
        orderBy(orderField),
        limit(pageSize)
    ];

    if (lastDoc) {
        return query(...baseQuery, startAfter(lastDoc));
    }
    return query(...baseQuery);
};

// --- EXPORTS ---
export {
    // Firebase instances
    app,
    auth,
    db,

    // Constants
    appId,
    SUPER_ADMIN_EMAIL,
    defaultSettings,

    // Firebase methods
    signInAnonymously,
    onAuthStateChanged,
    signInWithCustomToken,
    collection,
    addDoc,
    onSnapshot,
    query,
    updateDoc,
    doc,
    getDocs,
    deleteDoc,
    where,
    writeBatch,
    getDoc,
    increment,
    setDoc,
    arrayUnion,
    arrayRemove,
    orderBy,
    limit,
    startAfter,

    // Helpers
    getDataCollection,
    getDataDoc,
    getPaginatedQuery
};
