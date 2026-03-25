import { db } from '../../../config/firebase.js';

export const initializeUser = async (user: {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
}) => {
  const userRef = db.collection('users').doc(user.uid);

  await userRef.set(
    {
      email: user.email,
      displayName: user.displayName || 'New User',
      createdAt: new Date(),
      isPremium: false,
      credits: 5,
    },
    { merge: true },
  );

  return { message: 'User profile initialized' };
};
