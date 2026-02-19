import express from 'express';
import avatarRoutes from './modules/avatars/avatars.routes.ts';
import { errorHandler } from './middlewares/error.middleware.ts';

const app = express();

app.use('/api/avatars', avatarRoutes);
app.use(errorHandler);

export default app;
