import express from 'express';
import avatarRoutes from '@/modules/avatars/avatars.routes.js';
import authRoutes from '@/modules/auth/auth.routes.js';
import userRoutes from '@/modules/users/user.routes.js';
import albumsRoutes from '@/modules/albums/albums.routes.js';
import docsRoutes from '@/modules/docs/docs.routes.js';
import { errorHandler } from '@/middlewares/error.middleware.js';

const app = express();

app.disable('x-powered-by');

app.use(express.json());
app.use('/api/docs', docsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/albums', albumsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/avatars', avatarRoutes);
app.use(errorHandler);

export default app;
