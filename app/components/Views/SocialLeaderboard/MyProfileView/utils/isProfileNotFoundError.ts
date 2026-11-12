export const isProfileNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // `HttpError` from @metamask/controller-utils (thrown by ProfileService)
  // exposes the status as `httpStatus`; `status` covers fetch-style errors.
  const candidate = error as {
    status?: number;
    httpStatus?: number;
    message?: string;
  };
  if (candidate.status === 404 || candidate.httpStatus === 404) {
    return true;
  }

  return (
    typeof candidate.message === 'string' && /\b404\b/.test(candidate.message)
  );
};
