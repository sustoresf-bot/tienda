import admin from 'firebase-admin';
import { getEnv } from './env.js';

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const serviceAccountJson = getEnv('FIREBASE_SERVICE_ACCOUNT', {
    required: false,
    defaultValue: '',
    allowEmpty: true
  });

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return;
  }

  const projectId = getEnv('FIREBASE_PROJECT_ID', { required: false, defaultValue: '' });
  const clientEmail = getEnv('FIREBASE_CLIENT_EMAIL', { required: false, defaultValue: '' });
  const privateKey = getEnv('FIREBASE_PRIVATE_KEY', {
    required: false,
    defaultValue: '',
    transform: (v) => v.replace(/\\n/g, '\n')
  });

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
    return;
  }

  admin.initializeApp();
}

export function getFirebaseAdmin() {
  initFirebaseAdmin();
  return admin;
}
