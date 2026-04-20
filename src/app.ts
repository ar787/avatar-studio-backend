import express from 'express';
import avatarRoutes from '@/modules/avatars/avatars.routes.js';
import authRoutes from '@/modules/auth/auth.routes.js';
import userRoutes from '@/modules/users/user.routes.js';
import { errorHandler } from '@/middlewares/error.middleware.js';

const app = express();

app.use(express.json());
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/avatars', avatarRoutes);
app.use(errorHandler);

export default app;
