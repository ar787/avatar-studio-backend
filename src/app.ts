import express from 'express';
import avatarRoutes from './modules/avatars/avatars.routes.ts';

const app = express();

app.use('/api/avatars', avatarRoutes);

export default app;
