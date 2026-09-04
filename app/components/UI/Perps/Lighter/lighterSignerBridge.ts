import QuickCrypto from 'react-native-quick-crypto';
import type {
  LighterCreateClientParams,
  LighterSignerBridge,
  LighterWasmCall,
} from '@metamask/perps-controller';

import SecureKeychain from '../../../../core/SecureKeychain';

export interface LighterExecutorCall {
  function: LighterWasmCall['function'];
  params: unknown[];
}

export type LighterExecutor = (
  call: LighterExecutorCall,
  timeoutMs: number,
) => Promise<unknown>;

/** Upper bound covering both the pre-ready wait and the page round-trip. */
export const LIGHTER_SIGNER_TIMEOUT_MS = 90_000;
const LIGHTER_SIGNER_KEY_PREFIX = 'com.metamask.PERPS_LIGHTER_SIGNER';
const LIGHTER_SIGNER_KEY_NAME = 'LIGHTER_SIGNER_PRIVATE_KEY';
const PRIVATE_KEY_PATTERN = /^[0-9a-f]{64}$/u;
const RELOAD_ERROR = 'Lighter signer WebView reloaded; retry the operation';

const resetListeners = new Set<() => void>();
let executor: LighterExecutor | null = null;
let unavailableError: Error | null = null;
let readyResolve: () => void;
let readyReject: (reason: Error) => void;
let ready: Promise<void>;

function armReadiness(): void {
  ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  // A reset can happen before a caller attaches to the readiness promise.
  ready.catch(() => undefined);
}

armReadiness();

function notifyResetListeners(): void {
  for (const listener of resetListeners) {
    try {
      listener();
    } catch {
      // Listener errors must not break bridge recovery.
    }
  }
}

function timeoutAfter<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  if (timeoutMs <= 0) {
    return Promise.reject(new Error(message));
  }
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function signerKeyScope(params: LighterCreateClientParams) {
  return {
    service: `${LIGHTER_SIGNER_KEY_PREFIX}.${params.chainId}.${params.accountIndex}.${params.apiKeyIndex}`,
    accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

async function getOrCreatePrivateKey(
  params: LighterCreateClientParams,
): Promise<string> {
  const scope = signerKeyScope(params);
  const stored = await SecureKeychain.getSecureItem(scope);
  if (stored) {
    if (!PRIVATE_KEY_PATTERN.test(stored.value)) {
      throw new Error('Stored Lighter signer key is invalid');
    }
    return stored.value;
  }

  const privateKey = QuickCrypto.randomBytes(32).toString('hex');
  const storedKey = await SecureKeychain.setSecureItem(
    LIGHTER_SIGNER_KEY_NAME,
    privateKey,
    scope,
  );
  if (storedKey === false) {
    throw new Error('Unable to persist Lighter signer key');
  }
  return privateKey;
}

async function executeWithDeadline(
  call: LighterExecutorCall,
  deadline = Date.now() + LIGHTER_SIGNER_TIMEOUT_MS,
): Promise<unknown> {
  if (unavailableError) {
    throw unavailableError;
  }

  await timeoutAfter(
    ready,
    deadline - Date.now(),
    `Lighter signer not ready within ${LIGHTER_SIGNER_TIMEOUT_MS}ms for ${call.function}`,
  );

  if (unavailableError) {
    throw unavailableError;
  }
  const connectedExecutor = executor;
  if (!connectedExecutor) {
    throw new Error('Lighter signer bridge executor not connected');
  }

  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    throw new Error(
      `Lighter signer call ${call.function} exceeded the ${LIGHTER_SIGNER_TIMEOUT_MS}ms deadline`,
    );
  }
  return timeoutAfter(
    connectedExecutor(call, remainingMs),
    remainingMs,
    `Lighter signer call ${call.function} exceeded the ${LIGHTER_SIGNER_TIMEOUT_MS}ms deadline`,
  );
}

/** Connect the executor after the WASM page reports ready. */
export function connectLighterExecutor(newExecutor: LighterExecutor): void {
  if (unavailableError) {
    return;
  }
  executor = newExecutor;
  readyResolve();
}

/** Re-arm the bridge while the WebView reloads. */
export function resetLighterBridge(): void {
  executor = null;
  unavailableError = null;
  readyReject(new Error(RELOAD_ERROR));
  armReadiness();
  notifyResetListeners();
}

/** Fail current and future calls after the WebView exhausts reload attempts. */
export function setLighterBridgeUnavailable(reason: string): void {
  const error = new Error(reason);
  executor = null;
  unavailableError = error;
  readyReject(error);
  notifyResetListeners();
}

type LighterCreateClientResult = Awaited<
  ReturnType<LighterSignerBridge['createClient']>
>;

const createClient: LighterSignerBridge['createClient'] = async (params) => {
  const deadline = Date.now() + LIGHTER_SIGNER_TIMEOUT_MS;
  const privateKey = await timeoutAfter(
    getOrCreatePrivateKey(params),
    deadline - Date.now(),
    `Lighter signer client setup exceeded the ${LIGHTER_SIGNER_TIMEOUT_MS}ms deadline`,
  );
  return (await executeWithDeadline(
    {
      function: '_createClient',
      params: [
        privateKey,
        params.chainId,
        params.accountIndex,
        params.nonce,
        params.apiKeyIndex,
      ],
    },
    deadline,
  )) as LighterCreateClientResult;
};

// Results are validated against the pending call's operation before the
// WebView executor resolves; this assertion restores the package's generic
// operation/result relationship at the transport boundary.
const execute = (async (call: LighterWasmCall) => {
  if (call.function === '_createClient') {
    const [chainId, accountIndex, nonce, apiKeyIndex] = call.params;
    return createClient({ chainId, accountIndex, nonce, apiKeyIndex });
  }
  return executeWithDeadline(call);
}) as LighterSignerBridge['execute'];

/** Singleton bridge handed to PerpsController in the Lighter credentials. */
export const lighterSignerBridge: LighterSignerBridge = {
  createClient,
  execute,
  onReset(listener: () => void): () => void {
    resetListeners.add(listener);
    return () => {
      resetListeners.delete(listener);
    };
  },
  reset: resetLighterBridge,
};
