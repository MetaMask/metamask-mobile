import { getLatencyThresholds } from '../../util/deviceCapability/latencyStore';
import { HttpError, InvalidResponseError, NetworkTimeoutError } from './errors';

async function getJson<QueryFnData>(
  url: string,
  parse: (body: unknown) => QueryFnData,
  signal: AbortSignal,
): Promise<QueryFnData> {
  // The query cache is the only cache, so a refetch always reaches the server.
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new HttpError(response.status);
  try {
    return parse(await response.json());
  } catch (error) {
    throw new InvalidResponseError(error);
  }
}

/**
 * One attempt; the caller decides whether another follows. GETs `url` and
 * returns the body run through `parse`. Aborts the request after the device's
 * hung threshold, the same one the latency signal uses, and fails with
 * `NetworkTimeoutError` even if the native request ignores the abort, so a
 * stall still reaches retry and the error state. Aborting `signal` aborts the
 * request too.
 */
export async function networkAttempt<QueryFnData>(
  url: string,
  parse: (body: unknown) => QueryFnData,
  signal: AbortSignal,
): Promise<QueryFnData> {
  const controller = new AbortController();
  // TanStack makes one signal per fetch, so the listener does not outlive it.
  signal.addEventListener('abort', () => controller.abort());
  const { hungMs } = getLatencyThresholds();
  // The fetch wrapper must start sampling before the timeout starts counting.
  const request = getJson(url, parse, controller.signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new NetworkTimeoutError());
      controller.abort();
    }, hungMs);
  });
  try {
    return await Promise.race([request, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}
