import QuickCrypto from 'react-native-quick-crypto';
import type { Hex } from '@metamask/utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import type {
  LighterCreateClientParams,
  LighterSignerBridge,
  LighterWasmCall,
} from '@metamask/perps-controller';

import SecureKeychain from '../../../../core/SecureKeychain';
import { SecureKeychainDecryptionError } from '../../../../core/SecureKeychainError';
import Engine from '../../../../core/Engine';
import { getSelectedEvmAccountFromMessenger } from '@metamask/perps-controller/utils/accountUtils';
import { deriveLighterWalletKey } from './lighterWalletKey';
import {
  assertLighterClientParameters,
  assertLighterRegistrationMessage,
} from './lighterRegistration';

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
export const LIGHTER_SIGNER_LOCKED_ERROR = 'Lighter signer wallet is locked';

const resetListeners = new Set<() => void>();
// Keep these across bridge resets: native keychain writes can outlive callers.
const keychainOperations = new Map<string, Promise<void>>();
let generation = 0;
let executor: LighterExecutor | null = null;
let unavailableError: Error | null = null;
// Terminal unavailability outlives a reset: once the WebView exhausts its
// reload attempts it unmounts for good, so only a real remount (which
// reconnects an executor) can revive the bridge. Without this, a controller
// reset() would clear `unavailableError` and re-arm readiness against a page
// that never comes back, leaving callers to hang until the 90s deadline.
let isTerminallyUnavailable = false;
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

function assertGeneration(owner: number): void {
  if (!Engine.context.KeyringController.isUnlocked()) {
    throw new Error(LIGHTER_SIGNER_LOCKED_ERROR);
  }
  if (unavailableError) throw unavailableError;
  if (owner !== generation) throw new Error(RELOAD_ERROR);
}

async function withOwnership<T>(
  operation: (owner: number, retired: Promise<never>) => Promise<T>,
): Promise<T> {
  const owner = generation;
  assertGeneration(owner);
  let rejectRetired!: (error: Error) => void;
  const retired = new Promise<never>((_resolve, reject) => {
    rejectRetired = reject;
  });
  retired.catch(() => undefined);
  const onReset = () => {
    if (owner !== generation) {
      rejectRetired(unavailableError ?? new Error(RELOAD_ERROR));
    }
  };
  resetListeners.add(onReset);
  try {
    const result = await operation(owner, retired);
    assertGeneration(owner);
    return result;
  } finally {
    resetListeners.delete(onReset);
  }
}

async function getOrCreatePrivateKey(
  params: LighterCreateClientParams,
  owner: number,
): Promise<string> {
  const { address, assertWallet } = captureWalletBinding(params, owner);
  const scope = signerKeyScope(params);
  const previous = keychainOperations.get(scope.service);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  keychainOperations.set(scope.service, pending);
  try {
    if (previous) await previous;
    assertWallet();
    let decryptionError: SecureKeychainDecryptionError | undefined;
    const stored = await SecureKeychain.getSecureItem(scope).catch(
      (error: unknown) => {
        assertWallet();
        if (!(error instanceof SecureKeychainDecryptionError)) throw error;
        decryptionError = error;
        return null;
      },
    );
    assertWallet();
    if (stored) {
      if (!PRIVATE_KEY_PATTERN.test(stored.value)) {
        throw new Error('Stored Lighter signer key is invalid');
      }
      return stored.value;
    }

    const derived = await Engine.context.KeyringController.withKeyring(
      { address: address as Hex },
      async ({ keyring }) =>
        deriveLighterWalletKey(keyring, address as Hex, params),
    );
    assertWallet();
    // A software key can be reconstructed; candidate discovery must not fill
    // native storage with a derived seed for every occupied venue slot.
    if (derived !== null) return derived;
    // Unreadable storage may still hold a legacy trading key. Only an
    // audited software key can be reconstructed without replacing that item.
    if (decryptionError) throw decryptionError;
    const privateKey = QuickCrypto.randomBytes(32).toString('hex');
    const storedKey = await SecureKeychain.setSecureItem(
      LIGHTER_SIGNER_KEY_NAME,
      privateKey,
      scope,
    );
    assertWallet();
    if (storedKey === false) {
      throw new Error('Unable to persist Lighter signer key');
    }
    return privateKey;
  } finally {
    release();
    if (keychainOperations.get(scope.service) === pending) {
      keychainOperations.delete(scope.service);
    }
  }
}

function captureWalletBinding(
  params: { walletAddress?: string },
  owner: number,
) {
  const currentAddress = () =>
    getSelectedEvmAccountFromMessenger(Engine.controllerMessenger)?.address;
  const address = params.walletAddress ?? currentAddress();
  if (!address || !/^0x[0-9a-fA-F]{40}$/u.test(address)) {
    throw new Error('Lighter requires a selected Ethereum account');
  }
  const assertWallet = () => {
    assertGeneration(owner);
    if (currentAddress()?.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Lighter wallet changed while restoring its trading key');
    }
  };
  assertWallet();
  return { address: address as Hex, assertWallet };
}

async function executeWithDeadline(
  call: LighterExecutorCall,
  deadline: number,
  owner: number,
  retired: Promise<never>,
): Promise<unknown> {
  assertGeneration(owner);

  await timeoutAfter(
    Promise.race([ready, retired]),
    deadline - Date.now(),
    `Lighter signer not ready within ${LIGHTER_SIGNER_TIMEOUT_MS}ms for ${call.function}`,
  );

  assertGeneration(owner);
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
    Promise.race([connectedExecutor(call, remainingMs), retired]),
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

/**
 * Revive the bridge after terminal unavailability. Only the signer host may
 * call this, and only when it is actually remounting the WebView — a late
 * executor from the dying page must never resurrect a dead signer.
 */
export function reviveLighterBridge(): void {
  if (!isTerminallyUnavailable) {
    return;
  }
  isTerminallyUnavailable = false;
  unavailableError = null;
  executor = null;
  armReadiness();
}

/** Re-arm the bridge while the WebView reloads. */
export function resetLighterBridge(): void {
  generation += 1;
  executor = null;
  if (isTerminallyUnavailable) {
    // Keep failing fast rather than re-arming readiness for a dead page.
    notifyResetListeners();
    return;
  }
  unavailableError = null;
  readyReject(new Error(RELOAD_ERROR));
  armReadiness();
  notifyResetListeners();
}

/** Fail current and future calls after the WebView exhausts reload attempts. */
export function setLighterBridgeUnavailable(reason: string): void {
  const error = new Error(reason);
  executor = null;
  isTerminallyUnavailable = true;
  unavailableError = error;
  generation += 1;
  readyReject(error);
  notifyResetListeners();
}

type LighterCreateClientResult = Awaited<
  ReturnType<LighterSignerBridge['createClient']>
>;

const createClient: LighterSignerBridge['createClient'] = (params) =>
  withOwnership(async (owner, retired) => {
    assertLighterClientParameters(params);
    const deadline = Date.now() + LIGHTER_SIGNER_TIMEOUT_MS;
    const privateKey = await timeoutAfter(
      Promise.race([getOrCreatePrivateKey(params, owner), retired]),
      deadline - Date.now(),
      `Lighter signer client setup exceeded the ${LIGHTER_SIGNER_TIMEOUT_MS}ms deadline`,
    );
    const result = (await executeWithDeadline(
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
      owner,
      retired,
    )) as LighterCreateClientResult;
    assertLighterRegistrationMessage(params, result);
    return result;
  });

// Results are validated against the pending call's operation before the
// WebView executor resolves; this assertion restores the package's generic
// operation/result relationship at the transport boundary.
const execute = (async (call: LighterWasmCall) => {
  if (call.function === '_createClient') {
    const [chainId, accountIndex, nonce, apiKeyIndex] = call.params;
    return createClient({ chainId, accountIndex, nonce, apiKeyIndex });
  }
  return withOwnership((owner, retired) =>
    executeWithDeadline(
      call,
      Date.now() + LIGHTER_SIGNER_TIMEOUT_MS,
      owner,
      retired,
    ),
  );
}) as LighterSignerBridge['execute'];

const getStoredKeyIndices = (
  params: Parameters<
    NonNullable<LighterSignerBridge['getStoredKeyIndices']>
  >[0],
  allowSoftwareRecovery = false,
): Promise<number[]> =>
  withOwnership(async (owner, retired) => {
    const { assertWallet } = captureWalletBinding(params, owner);
    const deadline = Date.now() + LIGHTER_SIGNER_TIMEOUT_MS;
    const stored: number[] = [];
    for (const apiKeyIndex of new Set(params.apiKeyIndices)) {
      const clientParams = { ...params, apiKeyIndex, nonce: 0 };
      assertLighterClientParameters(clientParams);
      const scope = signerKeyScope(clientParams);
      await timeoutAfter(
        Promise.race([
          keychainOperations.get(scope.service) ?? Promise.resolve(),
          retired,
        ]),
        deadline - Date.now(),
        'Lighter signer key discovery timed out',
      );
      assertWallet();
      const item = await timeoutAfter(
        Promise.race([
          SecureKeychain.getSecureItem(scope).catch((error: unknown) => {
            assertWallet();
            if (
              !allowSoftwareRecovery ||
              !(error instanceof SecureKeychainDecryptionError)
            )
              throw error;
            return null;
          }),
          retired,
        ]),
        deadline - Date.now(),
        'Lighter signer key discovery timed out',
      );
      assertWallet();
      if (item && PRIVATE_KEY_PATTERN.test(item.value))
        stored.push(apiKeyIndex);
    }
    return stored;
  });

/** Singleton bridge handed to PerpsController in the Lighter credentials. */
export const lighterSignerBridge = {
  getRecoverableKeyIndices: async (params: {
    chainId: number;
    accountIndex: number;
    apiKeyIndices: number[];
    walletAddress?: string;
  }): Promise<number[]> =>
    withOwnership(async (owner) => {
      const { address, assertWallet } = captureWalletBinding(params, owner);
      const canDerive = await Engine.context.KeyringController.withKeyring(
        { address: address as Hex },
        async ({ keyring }) =>
          keyring.type === KeyringTypes.hd ||
          keyring.type === KeyringTypes.simple,
      );
      assertWallet();
      const stored = await getStoredKeyIndices(params, canDerive);
      assertWallet();
      return canDerive
        ? [...new Set([...stored, ...params.apiKeyIndices])]
        : stored;
    }),
  getStoredKeyIndices: (params) => getStoredKeyIndices(params),
  createClient,
  execute,
  onReset(listener: () => void): () => void {
    resetListeners.add(listener);
    return () => {
      resetListeners.delete(listener);
    };
  },
  reset: resetLighterBridge,
} satisfies LighterSignerBridge;
