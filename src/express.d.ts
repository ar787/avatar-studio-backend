import type { User } from '@/modules/users/types.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
