import { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from './openapi.js';
import config from '@/config/config.js';

export const setupDocs = (app: Express) => {
  if (config.nodeEnv === 'production') return;

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/api/docs.json', (_, res) => res.json(openApiSpec));
};
