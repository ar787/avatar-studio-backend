import { initializeApp } from 'firebase-admin/app';
import admin from 'firebase-admin';
import { type Storage } from 'firebase-admin/storage';
import config from './config.js';

const { credential, firestore: getFirestore, storage: getStorage } = admin;

initializeApp({
  credential: credential.applicationDefault(),
  projectId: config.firebaseProjectId,
  storageBucket: config.firebaseStorageBucket,
});

export const firestore = getFirestore;
export const db = firestore();
export const bucket: ReturnType<Storage['bucket']> = getStorage().bucket();
