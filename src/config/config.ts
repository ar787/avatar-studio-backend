import dotenv from 'dotenv';

dotenv.config();

type Config = {
  port: number;
  nodeEnv: string;
  geminiApiKey: string;
  firestoreEmulator: string;
};

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  firestoreEmulator: process.env.FIRESTORE_EMULATOR_HOST ?? '',
};

export default config;
