import { MessengerClientInitFunction } from '../../types';
import {
  NeoBankService,
  NeoBankServiceMessenger,
} from '@metamask/ramps-controller';
import {
  describeError,
  redact,
  vbaTrace,
} from '../../../../components/UI/Ramp/debug/vbaTrace';
import { getRampsContext, getRampsEnvironment } from './ramps-service-init';

const MAX_TRACED_BODY_LENGTH = 4000;
const ATTEMPT_WINDOW_MS = 60_000;

/**
 * Resolves the request URL from whatever `fetch` was called with.
 *
 * @param input - The first argument passed to `fetch`.
 * @returns The URL as a string, or an empty string when it cannot be read.
 */
function readUrl(input: RequestInfo | URL): string {
  try {
    if (typeof input === 'string') {
      return input;
    }
    if (input instanceof URL) {
      return input.toString();
    }
    return (input as Request).url ?? '';
  } catch {
    return '';
  }
}

/**
 * Parses a JSON request body so it can be sanitized before it is traced.
 *
 * @param body - The `body` passed in the fetch init.
 * @returns The parsed value, or `undefined` when it is not JSON text.
 */
function readRequestBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/**
 * Reads a failed response body off a clone, leaving the original stream intact
 * for the caller.
 *
 * @param response - The response to read.
 * @returns The body text, truncated, or a marker when it cannot be read.
 */
async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.clone().text();
    return text.length > MAX_TRACED_BODY_LENGTH
      ? `${text.slice(0, MAX_TRACED_BODY_LENGTH)}...[truncated]`
      : text;
  } catch {
    return '[unable to read body]';
  }
}

/**
 * Wraps the `fetch` handed to {@link NeoBankService} so every `/neobank/*` call
 * reports its URL, attempt number, latency, status, and - for failures - the
 * response body that the service's status-only `HttpError` discards.
 *
 * The wrapper never alters the request, the response, or the thrown error.
 *
 * @param baseFetch - The underlying fetch implementation.
 * @returns The traced fetch implementation.
 */
function createTracedNeoBankFetch(baseFetch: typeof fetch): typeof fetch {
  const attempts = new Map<string, { count: number; lastAt: number }>();

  return async function tracedNeoBankFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = readUrl(input);
    const method = init?.method ?? 'GET';
    const key = `${method} ${url}`;
    const now = Date.now();
    const previous = attempts.get(key);
    const attempt =
      previous && now - previous.lastAt < ATTEMPT_WINDOW_MS
        ? previous.count + 1
        : 1;
    attempts.set(key, { count: attempt, lastAt: now });

    const startedAt = now;
    vbaTrace('neobank.request', {
      method,
      url,
      attempt,
      requestBody: redact(readRequestBody(init?.body)),
    });

    try {
      const response = await baseFetch(input, init);
      const durationMs = Date.now() - startedAt;

      if (response.ok) {
        vbaTrace('neobank.response', {
          method,
          url,
          attempt,
          status: response.status,
          durationMs,
        });
      } else {
        vbaTrace('neobank.response.error', {
          method,
          url,
          attempt,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          responseBody: await readErrorBody(response),
        });
      }

      return response;
    } catch (error) {
      vbaTrace('neobank.request.failed', {
        method,
        url,
        attempt,
        durationMs: Date.now() - startedAt,
        error: describeError(error),
      });
      throw error;
    }
  } as typeof fetch;
}

/**
 * Initialize the neo-bank service (Ramp API `/neobank/*` proxy).
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const neoBankServiceInit: MessengerClientInitFunction<
  NeoBankService,
  NeoBankServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new NeoBankService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(),
    context: getRampsContext(),
    fetch: __DEV__ ? createTracedNeoBankFetch(fetch) : fetch,
  });

  return {
    controller: service,
  };
};
