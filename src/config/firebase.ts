import { initializeApp } from 'firebase-admin/app';
import admin from 'firebase-admin';

import serviceAccount from '../../serviceAccountKey.json' with { type: 'json' };

const { credential, firestore } = admin;
const cert = credential.cert(serviceAccount as admin.ServiceAccount);
initializeApp({
  credential: cert,
  // Your bucket name looks like: your-project-id.firebasestorage.app
  //   storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
});

export const db = firestore();
