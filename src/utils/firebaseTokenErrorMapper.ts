export const firebaseTokenErrorMapper = (error: any) => {
  switch (error.code) {
    case 'auth/id-token-expired':
      return 'Token expired. Please sign in again.';
    case 'auth/id-token-revoked':
      return 'Token has been revoked. Please sign in again.';
    case 'auth/argument-error':
      return 'Invalid token format';
    default:
      return 'Authentication failed';
  }
};
