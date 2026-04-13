export default function normalizeEmailToName(email: string | undefined) {
  if (!email) return 'User';

  let localPart = email.split('@')[0] as string;

  // 1. Remove all numbers
  localPart = localPart.replaceAll(/\d+/g, '');

  // 2. Replace separators (. , _ , -) with spaces
  const formattedPart = localPart.replaceAll(/[._-]/g, ' ');

  // 3. Split, Capitalize, and Join
  return formattedPart
    .split(' ')
    .filter(Boolean) // Cleans up extra spaces if numbers were between separators
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
