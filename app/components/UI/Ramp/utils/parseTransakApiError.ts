const TRANSAK_PHONE_REGISTERED_ERROR_CODE = 2020;

export interface TransakApiErrorDetails {
  errorCode?: string | number;
  message?: string;
}

function getAxiosStyleTransakError(
  error: Record<string, unknown>,
): TransakApiErrorDetails | undefined {
  const response = error.response;
  if (typeof response !== 'object' || response === null) {
    return undefined;
  }

  const data = (response as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const apiError = (data as { error?: unknown }).error;
  if (typeof apiError !== 'object' || apiError === null) {
    return undefined;
  }

  const { errorCode, message } = apiError as {
    errorCode?: string | number;
    message?: string;
  };

  return {
    errorCode,
    message: typeof message === 'string' ? message : undefined,
  };
}

/**
 * Normalizes Transak API errors from both legacy Axios-style responses and
 * `TransakApiError` thrown by `@metamask/ramps-controller`.
 */
export function parseTransakApiError(
  error: unknown,
): TransakApiErrorDetails | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  const axiosStyleError = getAxiosStyleTransakError(record);
  if (axiosStyleError?.errorCode !== undefined) {
    return axiosStyleError;
  }

  if ('errorCode' in record) {
    const { errorCode } = record;
    const apiMessage = record.apiMessage;

    return {
      errorCode:
        typeof errorCode === 'string' || typeof errorCode === 'number'
          ? errorCode
          : undefined,
      message: typeof apiMessage === 'string' ? apiMessage : undefined,
    };
  }

  return axiosStyleError;
}

export function isTransakPhoneRegisteredError(error: unknown): boolean {
  const { errorCode } = parseTransakApiError(error) ?? {};
  return (
    errorCode === TRANSAK_PHONE_REGISTERED_ERROR_CODE ||
    errorCode === String(TRANSAK_PHONE_REGISTERED_ERROR_CODE)
  );
}

export function extractRegisteredEmailFromTransakError(
  error: unknown,
  fallbackMessage = '',
): string {
  const message =
    parseTransakApiError(error)?.message ??
    (error instanceof Error ? error.message : fallbackMessage);

  if (!message) {
    return '';
  }

  const emailMatch = message.match(/[\w*]+@[\w*]+(?:\.[\w*]+)*/);
  return emailMatch?.[0] ?? '';
}
