const USER_REJECTION_PATTERNS = [
  'user rejected',
  'user denied',
  'user cancelled',
  'rejected by user',
  'request rejected',
];

export function isUserRejection(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message.toLowerCase()
      : String(err).toLowerCase();
  return USER_REJECTION_PATTERNS.some((pattern) => message.includes(pattern));
}
