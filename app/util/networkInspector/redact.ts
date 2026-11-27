const SENSITIVE_HEADER =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|.*token.*|.*secret.*)$/i;

const TEXT_CONTENT_TYPE =
  /^(text\/|application\/(json|xml|javascript|graphql|x-www-form-urlencoded)|.*\+(json|xml))/i;

export const REDACTED = '[redacted]';

export function redactHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    redacted[name] = SENSITIVE_HEADER.test(name) ? REDACTED : value;
  }
  return redacted;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [+${text.length - max} chars]`;
}

// A missing content type is treated as text: JSON-RPC and most dev APIs omit it.
export function isTextContentType(contentType: string | null | undefined) {
  if (!contentType) return true;
  return TEXT_CONTENT_TYPE.test(contentType);
}

/** Flatten `HeadersInit`, a `Headers` instance or a plain object into a record. */
export function headersToObject(
  headers: RequestInit['headers'] | Headers | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;
  if (Array.isArray(headers)) {
    for (const [name, value] of headers) result[name] = value;
    return result;
  }
  if (typeof (headers as Headers).forEach === 'function') {
    (headers as Headers).forEach((value, name) => {
      result[name] = value;
    });
    return result;
  }
  return { ...(headers as Record<string, string>) };
}

/** Parse `XMLHttpRequest.getAllResponseHeaders()` output. */
export function parseRawHeaders(raw: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of (raw ?? '').split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    result[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return result;
}
