export function prefixError(error: unknown, prefix: string): Error {
  if (error instanceof Error) {
    const prefixedError = error;

    if (!prefixedError.message.startsWith(prefix)) {
      prefixedError.message = `${prefix}${prefixedError.message}`;
    }

    return prefixedError;
  }

  return new Error(`${prefix}${String(error)}`);
}
