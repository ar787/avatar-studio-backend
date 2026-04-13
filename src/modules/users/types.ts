export type User = {
  uid: string;
  displayName: string;
  picture: string;
  email: string;
  emailVerified: boolean;
};

export type UserProfile = Omit<User, 'uid'> & {
  credits: number;
  isPremium: boolean;
  createdAt: Date;
};
