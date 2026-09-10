import {
  connectLighterExecutor,
  LIGHTER_SIGNER_TIMEOUT_MS,
  lighterSignerBridge,
  resetLighterBridge,
  setLighterBridgeUnavailable,
} from './lighterSignerBridge';
import QuickCrypto from 'react-native-quick-crypto';
import type { Result as KeychainResult } from 'react-native-keychain';
import SecureKeychain from '../../../../core/SecureKeychain';

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  default: {
    randomBytes: jest.fn(() => Buffer.alloc(32, 0xab)),
  },
}));

jest.mock('../../../../core/SecureKeychain', () => ({
  __esModule: true,
  default: {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' },
    getSecureItem: jest.fn(),
    setSecureItem: jest.fn(),
  },
}));

const mockSecureKeychain = jest.mocked(SecureKeychain);

describe('lighterSignerBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureKeychain.getSecureItem.mockResolvedValue(null);
    mockSecureKeychain.setSecureItem.mockResolvedValue({
      service: 'test',
      storage: 'KeystoreAESGCM_NoAuth',
    } as KeychainResult);
  });

  afterEach(() => {
    resetLighterBridge();
    jest.useRealTimers();
  });

  it('queues calls until the executor connects, then executes them', async () => {
    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });
    const executor = jest
      .fn()
      .mockResolvedValue({ token: 'ok', deadline: 123 });
    connectLighterExecutor(executor);

    await expect(pending).resolves.toStrictEqual({
      token: 'ok',
      deadline: 123,
    });
    expect(executor).toHaveBeenCalledWith(
      {
        function: '_createAuthToken',
        params: [28, 7],
      },
      expect.any(Number),
    );
  });

  it('rejects callers waiting on readiness when the WebView reloads', async () => {
    // The page-side WASM state is gone on reload; a queued caller must fail
    // fast and retry, not hang on a readiness promise that was re-armed.
    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });
    resetLighterBridge();
    await expect(pending).rejects.toThrow(
      'Lighter signer WebView reloaded; retry the operation',
    );
  });

  it('times out instead of queueing forever when the signer never mounts', async () => {
    jest.useFakeTimers();
    try {
      let failure: Error | null = null;
      const pending = lighterSignerBridge
        .execute({ function: '_createAuthToken', params: [28, 7] })
        .catch((error: Error) => {
          failure = error;
        });
      jest.advanceTimersByTime(90_001);
      await pending;
      expect(String(failure)).toContain('Lighter signer not ready within');
    } finally {
      jest.useRealTimers();
    }
  });

  it('passes only the remaining shared deadline to page execution', async () => {
    jest.useFakeTimers();
    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });
    await jest.advanceTimersByTimeAsync(60_000);
    const executor = jest
      .fn()
      .mockResolvedValue({ token: 'ok', deadline: 123 });

    connectLighterExecutor(executor);
    await pending;

    expect(executor).toHaveBeenCalledWith(
      expect.objectContaining({ function: '_createAuthToken' }),
      LIGHTER_SIGNER_TIMEOUT_MS - 60_000,
    );
  });

  it('rejects future calls immediately after terminal unavailability', async () => {
    const executor = jest.fn();
    connectLighterExecutor(executor);
    setLighterBridgeUnavailable('Lighter signer unavailable');

    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });

    await expect(pending).rejects.toThrow('Lighter signer unavailable');
    expect(executor).not.toHaveBeenCalled();
  });

  it('ignores late executor connections after terminal unavailability', async () => {
    const zombieExecutor = jest.fn();
    setLighterBridgeUnavailable('Lighter signer unavailable');

    connectLighterExecutor(zombieExecutor);
    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });

    await expect(pending).rejects.toThrow('Lighter signer unavailable');
    expect(zombieExecutor).not.toHaveBeenCalled();
  });

  it('persists a generated key and keeps it inside createClient transport params', async () => {
    const executor = jest.fn().mockResolvedValue({
      success: true,
      pk: 'public-key',
      pubKeySuccess: true,
      body: 'change-key-body',
    });
    connectLighterExecutor(executor);

    await lighterSignerBridge.createClient({
      chainId: 300,
      accountIndex: 28,
      nonce: 9,
      apiKeyIndex: 7,
    });

    const privateKey = Buffer.alloc(32, 0xab).toString('hex');
    expect(QuickCrypto.randomBytes).toHaveBeenCalledWith(32);
    expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledWith(
      'LIGHTER_SIGNER_PRIVATE_KEY',
      privateKey,
      expect.objectContaining({
        service: 'com.metamask.PERPS_LIGHTER_SIGNER.300.28.7',
      }),
    );
    expect(executor).toHaveBeenCalledWith(
      {
        function: '_createClient',
        params: [privateKey, 300, 28, 9, 7],
      },
      expect.any(Number),
    );
  });
  it('reuses a valid stored key instead of generating a new one', async () => {
    const storedKey = 'a'.repeat(64);
    mockSecureKeychain.getSecureItem.mockResolvedValue({
      value: storedKey,
    } as Awaited<ReturnType<typeof SecureKeychain.getSecureItem>>);
    const executor = jest.fn().mockResolvedValue({
      pubKeySuccess: true,
      body: 'change-key-body',
    });
    connectLighterExecutor(executor);

    await lighterSignerBridge.createClient({
      chainId: 300,
      accountIndex: 28,
      nonce: 9,
      apiKeyIndex: 7,
    });

    expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
    expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    expect(executor).toHaveBeenCalledWith(
      {
        function: '_createClient',
        params: [storedKey, 300, 28, 9, 7],
      },
      expect.any(Number),
    );
  });

  it('rejects a stored key that is not a 64-character hex string', async () => {
    // A corrupted or truncated keychain entry must fail loudly rather than
    // reach the WASM signer, where it would produce invalid signatures.
    mockSecureKeychain.getSecureItem.mockResolvedValue({
      value: 'not-a-valid-key',
    } as Awaited<ReturnType<typeof SecureKeychain.getSecureItem>>);
    connectLighterExecutor(jest.fn());

    await expect(
      lighterSignerBridge.createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
      }),
    ).rejects.toThrow('Stored Lighter signer key is invalid');
  });

  it('surfaces a keychain write failure instead of returning an unpersisted key', async () => {
    // setSecureItem returning false means the key never reached the keychain;
    // continuing would sign with a key that cannot be recovered next launch.
    mockSecureKeychain.setSecureItem.mockResolvedValue(
      false as unknown as Awaited<
        ReturnType<typeof SecureKeychain.setSecureItem>
      >,
    );
    connectLighterExecutor(jest.fn());

    await expect(
      lighterSignerBridge.createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
      }),
    ).rejects.toThrow('Unable to persist Lighter signer key');
  });

  it('notifies reset listeners and stops after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = lighterSignerBridge.onReset(listener);

    resetLighterBridge();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    resetLighterBridge();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps notifying remaining listeners when one throws', () => {
    // A misbehaving listener must not abort bridge recovery for the others.
    const failing = jest.fn(() => {
      throw new Error('listener boom');
    });
    const healthy = jest.fn();
    lighterSignerBridge.onReset(failing);
    lighterSignerBridge.onReset(healthy);

    expect(() => resetLighterBridge()).not.toThrow();
    expect(healthy).toHaveBeenCalledTimes(1);
  });
});
