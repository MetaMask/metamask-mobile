export const isProfileNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { status?: number; message?: string };
  if (candidate.status === 404) {
    return true;
  }

  return (
    typeof candidate.message === 'string' && /\b404\b/.test(candidate.message)
  );
};
