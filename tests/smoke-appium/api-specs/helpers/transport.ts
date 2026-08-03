import { v4 as uuid } from 'uuid';
import PlaywrightWebMatchers from '../../../framework/PlaywrightWebMatchers.js';
import { getDriver } from '../../../framework/PlaywrightUtilities.js';
import { sleep } from '../../../framework/Utilities.js';
import { getAppiumServerUrl } from '../../../framework/services/appium/AppiumServer.js';

export interface EthereumRpcError {
  code?: number;
  message?: string;
  data?: unknown;
}

export interface EthereumRpcResponse {
  result?: unknown;
  error?: EthereumRpcError;
}

interface QueueTask {
  name: string;
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

const taskQueue: QueueTask[] = [];
let isProcessing = false;
let queueGeneration = 0;

const POLL_INTERVAL_MS = 500;
const DEFAULT_TIMEOUT_MS = 30_000;

interface AppiumExecuteBody {
  value?: unknown;
  error?: unknown;
  message?: string;
}

function isRuntimeDomainError(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as { error?: { message?: string } };
  return /Runtime['"]?\s*domain was not found/i.test(
    record.error?.message ?? '',
  );
}

/**
 * WDIO `driver.execute` can fail opaquely in iOS WKWebView contexts.
 * Call Appium `/execute/sync` directly after `withWebViewAction` has switched
 * into the dapp WebView.
 */
async function executeInCurrentContext(script: string): Promise<unknown> {
  const driver = getDriver();
  const sessionId = driver.sessionId;
  if (!sessionId) {
    throw new Error('No Appium session id for WebView execute');
  }

  const response = await fetch(
    `${getAppiumServerUrl()}/session/${sessionId}/execute/sync`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, args: [] }),
    },
  );
  const bodyText = await response.text();
  let body: AppiumExecuteBody;
  try {
    body = JSON.parse(bodyText) as AppiumExecuteBody;
  } catch {
    throw new Error(
      `Appium execute/sync non-JSON response (${response.status}): ${bodyText}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Appium execute/sync failed (${response.status}): ${bodyText}`,
    );
  }

  if (body.error != null) {
    throw new Error(
      `Appium execute/sync error payload: ${JSON.stringify(body)}`,
    );
  }

  // Appium may return HTTP 200 with a nested WebKit inspector error.
  if (isRuntimeDomainError(body.value)) {
    throw new Error(
      `WebKit inspector Runtime domain unavailable (iOS WebView JS bridge). ` +
        `Raw value: ${JSON.stringify(body.value)}. ` +
        `Try an iOS 18.x simulator with a matching WDA build; iOS 26.x currently returns this error.`,
    );
  }

  if (
    body.value &&
    typeof body.value === 'object' &&
    'error' in (body.value as object)
  ) {
    throw new Error(
      `Appium execute/sync nested error: ${JSON.stringify(body.value)}`,
    );
  }

  return body.value;
}

/**
 * Drop queued work and abandon the current processor chain.
 * Required for Playwright CI retries (`retries: 1`): the worker reuses this
 * module, so leftover tasks from a failed run would otherwise run before the
 * retry and corrupt OpenRPC fire → Cancel → poll ordering.
 */
export function clearTransportQueue(): void {
  queueGeneration += 1;
  const pending = taskQueue.splice(0, taskQueue.length);
  isProcessing = false;
  for (const item of pending) {
    item.reject(new Error('Transport queue cleared'));
  }
}

export const processQueue = async (): Promise<void> => {
  if (isProcessing || taskQueue.length === 0) {
    return;
  }

  const generation = queueGeneration;
  isProcessing = true;
  const { task, resolve, reject } = taskQueue.shift() as QueueTask;
  try {
    resolve(await task());
  } catch (error) {
    reject(error);
  } finally {
    // Skip continuing if clearTransportQueue ran mid-flight (generation bumped).
    if (generation === queueGeneration) {
      isProcessing = false;
      await processQueue();
    }
  }
};

export const addToQueue = ({
  task,
  resolve,
  reject,
  name: _name,
}: {
  name: string;
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}): Promise<void> => {
  taskQueue.push({ name: _name, task, resolve, reject });
  return processQueue();
};

const parseWindowPayload = (text: unknown): EthereumRpcResponse | undefined => {
  if (text === undefined || text === null) {
    return undefined;
  }
  if (typeof text === 'string') {
    return JSON.parse(text) as EthereumRpcResponse;
  }
  return text as EthereumRpcResponse;
};

async function waitForEthereumProvider(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await executeInCurrentContext(
      `return (typeof window.ethereum !== 'undefined' && typeof window.ethereum.request === 'function') ? 'ready' : 'missing';`,
    );
    if (status === 'ready') {
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const href = await executeInCurrentContext('return location.href;');
  const title = await executeInCurrentContext('return document.title;');
  const ethType = await executeInCurrentContext(
    'return typeof window.ethereum;',
  );
  throw new Error(
    `window.ethereum.request is not available after ${timeoutMs}ms. href=${JSON.stringify(
      href,
    )} title=${JSON.stringify(title)} ethType=${JSON.stringify(ethType)}`,
  );
}

/**
 * Start `window.ethereum.request` without waiting for the response.
 * Used so ConfirmationsRejectRule can tap Cancel while the request is open
 * (same fire/poll split as Detox api-specs helpers).
 */
export async function fireEthereumRequest(
  pageUrl: string,
  method: string,
  params: unknown[] = [],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const generatedKey = uuid();

  await PlaywrightWebMatchers.withWebViewAction(pageUrl, async () => {
    await waitForEthereumProvider(timeoutMs);
    await executeInCurrentContext(
      `var g=${JSON.stringify(generatedKey)};var m=${JSON.stringify(
        method,
      )};var p=${JSON.stringify(
        params,
      )};window.ethereum.request({method:m,params:p}).then(function(res){window[g]=JSON.stringify({result:res});}).catch(function(err){window[g]=JSON.stringify({error:{code:err&&err.code,message:err&&err.message,data:err&&err.data}});});return 'started';`,
    );
  });

  return generatedKey;
}

/**
 * Poll a previously fired ethereum request until the window key is set.
 */
export async function pollEthereumResponse(
  pageUrl: string,
  generatedKey: string,
  method: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<EthereumRpcResponse> {
  let response: EthereumRpcResponse | undefined;

  await PlaywrightWebMatchers.withWebViewAction(pageUrl, async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const text = await executeInCurrentContext(
        `return window[${JSON.stringify(generatedKey)}];`,
      );
      const parsed = parseWindowPayload(text);
      if (parsed !== undefined) {
        await executeInCurrentContext(
          `delete window[${JSON.stringify(generatedKey)}]; return true;`,
        );
        response = parsed;
        return;
      }
    }

    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for ethereum.${method} response`,
    );
  });

  if (!response) {
    throw new Error(`No response captured for ethereum.${method}`);
  }
  return response;
}

/**
 * Fire `window.ethereum.request` in the in-app browser WebView and poll a
 * window key for the JSON result (same pattern as Detox api-specs helpers).
 *
 * iOS Appium only.
 */
export async function requestViaEthereumProvider(
  pageUrl: string,
  method: string,
  params: unknown[] = [],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<EthereumRpcResponse> {
  const generatedKey = await fireEthereumRequest(
    pageUrl,
    method,
    params,
    timeoutMs,
  );
  return pollEthereumResponse(pageUrl, generatedKey, method, timeoutMs);
}

/**
 * OpenRPC transport compatible with `@open-rpc/test-coverage`.
 *
 * Fire is queued separately from poll so ConfirmationsRejectRule.afterRequest
 * can enqueue Cancel between them (matches Detox helpers.js).
 */
export const createAppiumDriverTransport =
  (pageUrl: string) =>
  async (
    _url: string | undefined,
    method: string,
    params: unknown[] | Record<string, unknown> | undefined,
  ): Promise<EthereumRpcResponse> => {
    const normalizedParams = Array.isArray(params)
      ? params
      : params
        ? [params]
        : [];

    // Fire and poll are separate queue items so ConfirmationsRejectRule
    // afterRequest (Cancel) can run between them — same ordering as Detox.
    return new Promise((resolve, reject) => {
      void addToQueue({
        name: `transport-fire:${method}`,
        resolve: resolve as (value: unknown) => void,
        reject,
        task: async () =>
          fireEthereumRequest(pageUrl, method, normalizedParams),
      });
    }).then(
      (generatedKey) =>
        new Promise((resolve, reject) => {
          void addToQueue({
            name: `transport-poll:${method}`,
            resolve: resolve as (value: unknown) => void,
            reject,
            task: async () =>
              pollEthereumResponse(pageUrl, generatedKey as string, method),
          });
        }),
    );
  };
