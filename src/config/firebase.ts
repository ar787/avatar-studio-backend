import { initializeApp } from 'firebase-admin/app';
import admin from 'firebase-admin';
import { type Storage } from 'firebase-admin/storage';

import serviceAccount from '../../serviceAccountKey.json' with { type: 'json' };
import config from './config.ts';

const { credential, firestore, storage: getStorage } = admin;
const cert = credential.cert(serviceAccount as admin.ServiceAccount);

initializeApp({
  credential: cert,
  projectId: config.firebaseProjectId,
  storageBucket: config.firebaseStorageBucket,
});

export const db = firestore();
export const bucket: ReturnType<Storage['bucket']> = getStorage().bucket();
