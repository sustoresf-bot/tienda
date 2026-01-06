import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    doc, orderBy, limit, startAfter, onSnapshot, setDoc, writeBatch
} from 'firebase/firestore';
import { db, appId } from '@config';

const DATA_PATH = ['artifacts', appId, 'public', 'data'];

// Generic Subscribe
export const subscribeToCollection = (subPath, callback) => {
    const q = collection(db, ...DATA_PATH, subPath);
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(data);
    });
};

// Products Service with Pagination
export const fetchProducts = async (pageSize = 20, lastVisible = null) => {
    let q = query(
        collection(db, ...DATA_PATH, 'products'),
        orderBy('name'),
        limit(pageSize)
    );

    if (lastVisible) {
        q = query(q, startAfter(lastVisible));
    }

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return { products, lastDoc };
};

// Auth Services (Login/Register)
export const loginUser = async (emailOrUser, password) => {
    const usersRef = collection(db, ...DATA_PATH, 'users');

    // Check Email
    let q = query(usersRef, where("email", "==", emailOrUser), where("password", "==", password));
    let snapshot = await getDocs(q);

    // Filter by Username if Email fails
    if (snapshot.empty) {
        q = query(usersRef, where("username", "==", emailOrUser), where("password", "==", password));
        snapshot = await getDocs(q);
    }

    if (snapshot.empty) throw new Error("Credenciales incorrectas.");

    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const registerUser = async (userData) => {
    const usersRef = collection(db, ...DATA_PATH, 'users');

    // Duplicates Check
    const emailCheck = await getDocs(query(usersRef, where("email", "==", userData.email)));
    if (!emailCheck.empty) throw new Error("Email ya registrado.");

    const userCheck = await getDocs(query(usersRef, where("username", "==", userData.username)));
    if (!userCheck.empty) throw new Error("Usuario ya en uso.");

    const docRef = await addDoc(usersRef, {
        ...userData,
        role: 'user',
        joinDate: new Date().toISOString(),
        favorites: [],
        ordersCount: 0
    });

    return { id: docRef.id, ...userData };
};

// Orders & Other CRUD
export const saveOrder = async (orderData) => {
    const ordersRef = collection(db, ...DATA_PATH, 'orders');
    return await addDoc(ordersRef, orderData);
};

export const updateDocument = async (subPath, docId, data) => {
    const docRef = doc(db, ...DATA_PATH, subPath, docId);
    return await updateDoc(docRef, data);
};

export const deleteDocument = async (subPath, docId) => {
    const docRef = doc(db, ...DATA_PATH, subPath, docId);
    return await deleteDoc(docRef);
};
