import dotenv from 'dotenv';

dotenv.config();

type Config = {
  port: number;
  nodeEnv: string;
  geminiApiKey: string;
  firestoreEmulator: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
};

const config: Config = {
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  firestoreEmulator: process.env.FIRESTORE_EMULATOR_HOST ?? '',
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
};

export default config;
