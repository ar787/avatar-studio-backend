import express from 'express';
import avatarRoutes from './modules/avatars/avatars.routes.ts';
import authRoutes from './modules/auth/auth.routes.ts';
import userRoutes from './modules/users/user.routes.ts';
import { errorHandler } from './middlewares/error.middleware.ts';

const app = express();

app.use(express.json());
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/avatars', avatarRoutes);
app.use(errorHandler);

export default app;
