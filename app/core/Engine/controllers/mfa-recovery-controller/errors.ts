/** Error raised by the MFA recovery integration. */
export class MfaRecoveryControllerError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MfaRecoveryControllerError';
    this.code = code;
  }
}

/** Returns a stable error code without exposing tokens or secrets. */
export function getMfaRecoveryErrorCode(error: unknown): string {
  if (!isRecord(error)) {
    return 'unknown_error';
  }
  if (typeof error.code === 'string' && error.code.length > 0) {
    return error.code;
  }
  if (typeof error.errorCode === 'string' && error.errorCode.length > 0) {
    return error.errorCode;
  }
  if (typeof error.status === 'number') {
    return `http_${error.status}`;
  }
  return 'unknown_error';
}

/** Returns short diagnostic detail for the developer UI. */
export function getMfaRecoveryErrorDetail(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const parts: string[] = [];
  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    parts.push(error.message.trim());
  }
  if (typeof error.statusText === 'string' && error.statusText.length > 0) {
    parts.push(error.statusText);
  }
  if (typeof error.errorCode === 'string') {
    parts.push(`errorCode=${error.errorCode}`);
  }
  if (typeof error.requestId === 'string') {
    parts.push(`requestId=${error.requestId}`);
  }
  if (typeof error.url === 'string') {
    parts.push(error.url);
  }

  const detail = parts.join(' | ');
  return detail.length === 0 ? undefined : detail.slice(0, 400);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
