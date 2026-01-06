import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
    apiKey: "AIzaSyAfllte-D_I3h3TwBaiSL4KVfWrCSVh9ro",
    authDomain: "sustore-63266.firebaseapp.com",
    projectId: "sustore-63266",
    storageBucket: "sustore-63266.firebasestorage.app",
    messagingSenderId: "684651914850",
    appId: "1:684651914850:web:f3df09e5caf6e50e9e533b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = "sustore-prod-v3";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { type, data } = req.body;

    // Logic for MercadoPago/Stripe
    if (type === 'payment.updated') {
        const paymentId = data.id;
        const status = data.status; // 'approved', etc.
        const orderId = data.external_reference;

        if (status === 'approved' && orderId) {
            try {
                const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
                await updateDoc(orderRef, { status: 'Realizado', paymentStatus: 'Pagado' });
                return res.status(200).json({ success: true });
            } catch (error) {
                return res.status(500).json({ error: error.message });
            }
        }
    }

    res.status(200).json({ received: true });
}
