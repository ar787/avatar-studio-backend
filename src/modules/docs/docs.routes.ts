import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from '@/docs/openapi.js';
import config from '@/config/config.js';

const router = Router();

router.use((_: Request, res: Response, next: NextFunction) => {
  if (config.nodeEnv === 'production') {
    return res.status(404).end();
  }
  next();
});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec));
router.get('/json', (_: Request, res: Response) => res.json(openApiSpec));

export default router;
