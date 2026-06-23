export function prefixError(error: unknown, prefix: string): Error {
  const message = getErrorMessage(error);

  if (error instanceof Error) {
    if (!message.startsWith(prefix)) {
      error.message = `${prefix}${message}`;
    } else {
      error.message = message;
    }

    return error;
  }

  return new Error(`${prefix}${message}`);
}

function getErrorMessage(error: unknown): string {
  return (
    getCallErrorMessage(error) ??
    (error instanceof Error ? error.message : String(error))
  );
}

function getCallErrorMessage(error: unknown): string | undefined {
  if (
    !(error instanceof Error) ||
    typeof (error as Record<string, unknown>).reason !== 'string' ||
    (error as Record<string, unknown>).code !== 'CALL_EXCEPTION' ||
    !error.message.includes('code=CALL_EXCEPTION')
  ) {
    return undefined;
  }

  const { method, reason, transaction } = error as {
    method?: string;
    reason: string;
    transaction?: { data?: string };
  };

  if (method) {
    return `eth_call failed - ${method.split('(')[0]} - ${reason}`;
  }

  const selector = transaction?.data?.slice(0, 10);
  if (selector) {
    return `eth_call failed - ${selector}`;
  }

  return 'eth_call failed';
}
