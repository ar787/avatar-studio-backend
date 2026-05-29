/**
 * Manual Vitest mock for verifyAuthToken.middleware.
 *
 * Any test file that calls
 *   vi.mock('@/middlewares/verifyAuthToken.middleware.js')
 * without a factory will receive this implementation automatically.
 *
 * Behaviour:
 *  - Missing x-test-uid header → 401 Unauthorized (mirrors real middleware).
 *  - Present x-test-uid header → sets req.user and calls next().
 *
 * Tests that need the "passthrough" variant (always call next, let the
 * controller return 401) should supply their own inline factory instead.
 */

import { HttpStatusCode } from '@/utils/httpStatusCodes.js';

export const verifyAuthTokenHandler = (
  req: unknown,
  res: unknown,
  next: unknown,
): void => {
  const r = req as {
    headers: Record<string, string | undefined>;
    user?: unknown;
  };

  const uid = r.headers['x-test-uid'];

  if (!uid) {
    const response = res as {
      status: (n: number) => { json: (b: unknown) => void };
    };
    response
      .status(HttpStatusCode.UNAUTHORIZED)
      .json({ success: false, message: 'Unauthorized' });
    return;
  }

  r.user = {
    uid,
    email: '',
    emailVerified: false,
    displayName: '',
    picture: '',
  };

  (next as () => void)();
};
