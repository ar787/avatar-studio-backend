// Must run before any firebase-admin import so the Admin SDK connects to the emulator
process.env['FIRESTORE_EMULATOR_HOST'] = '127.0.0.1:8081';
process.env['FIREBASE_STORAGE_EMULATOR_HOST'] = '127.0.0.1:9199';
