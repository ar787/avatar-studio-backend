import { db } from '../../config/firebase.ts';

export const fetchPublicAvatarsRepo = async () => {
  const snapshot = await db.collection('avatars').get();
  return snapshot.docs.map((doc) => doc.data());
};
