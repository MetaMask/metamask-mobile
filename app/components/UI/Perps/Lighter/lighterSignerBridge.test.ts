import Engine from '../../../../core/Engine';
import {
  connectLighterExecutor,
  LIGHTER_SIGNER_TIMEOUT_MS,
  lighterSignerBridge,
  resetLighterBridge,
  reviveLighterBridge,
  setLighterBridgeUnavailable,
} from './lighterSignerBridge';
import QuickCrypto from 'react-native-quick-crypto';
import type { Result as KeychainResult } from 'react-native-keychain';
import SecureKeychain from '../../../../core/SecureKeychain';
import { SecureKeychainDecryptionError } from '../../../../core/SecureKeychainError';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        isUnlocked: jest.fn(() => true),
        withKeyring: jest.fn(),
      },
      AccountsController: {
        getSelectedAccount: jest.fn(() => ({
          address: `0x${'1'.repeat(40)}`,
          type: 'eip155:eoa',
        })),
      },
      AccountTreeController: {
        getAccountsFromSelectedAccountGroup: jest.fn(() => [
          { address: `0x${'1'.repeat(40)}`, type: 'eip155:eoa' },
        ]),
      },
    },
    controllerMessenger: { subscribe: jest.fn(), tryUnsubscribe: jest.fn() },
  },
}));

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
const clientResult = {
  success: true,
  pubKeySuccess: true,
  pk: 'a'.repeat(80),
  body: `Register Lighter Account\n\npubkey: 0x${'a'.repeat(80)}\nnonce: 0x0000000000000009\naccount index: 0x000000000000001c\napi key index: 0x0000000000000007\nOnly sign this message for a trusted client!`,
};

describe('lighterSignerBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.AccountsController.getSelectedAccount)
      .mockReturnValue({
        address: `0x${'1'.repeat(40)}`,
        type: 'eip155:eoa',
      } as never);
    Engine.controllerMessenger.call = jest.fn((action) => {
      if (action === 'AccountsController:getSelectedAccount')
        return Engine.context.AccountsController.getSelectedAccount();
      if (
        action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
      )
        return Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup();
      throw new Error('Unexpected account action');
    }) as typeof Engine.controllerMessenger.call;
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(true);
    mockSecureKeychain.getSecureItem.mockResolvedValue(null);
    mockSecureKeychain.setSecureItem.mockResolvedValue({
      service: 'test',
      storage: 'KeystoreAESGCM_NoAuth',
    } as KeychainResult);
    jest
      .mocked(Engine.context.KeyringController.withKeyring)
      .mockImplementation(async (_selector, operation) =>
        operation({ keyring: { type: 'Ledger Hardware' } } as never),
      );
  });

  afterEach(() => {
    reviveLighterBridge();
    resetLighterBridge();
    jest.useRealTimers();
  });

  it('rejects work arriving after wallet lock before reading the key', async () => {
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(false);

    await expect(
      lighterSignerBridge.createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
      }),
    ).rejects.toThrow('wallet is locked');

    expect(mockSecureKeychain.getSecureItem).not.toHaveBeenCalled();
  });

  it('checks wallet state again before returning an executor result', async () => {
    connectLighterExecutor(
      jest.fn().mockImplementation(async () => {
        jest
          .mocked(Engine.context.KeyringController.isUnlocked)
          .mockReturnValue(false);
        return { token: 'retired', deadline: 123 };
      }),
    );

    await expect(
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [28, 7],
      }),
    ).rejects.toThrow('wallet is locked');
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

  it('retires setup immediately when reset interrupts key retrieval', async () => {
    jest.useFakeTimers();
    let finishRead!: (
      value: Awaited<ReturnType<typeof SecureKeychain.getSecureItem>>,
    ) => void;
    mockSecureKeychain.getSecureItem.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        }),
    );
    const rejected = jest.fn();
    const executor = jest.fn();
    const pending = lighterSignerBridge
      .createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
      })
      .catch(rejected);

    resetLighterBridge();
    await jest.advanceTimersByTimeAsync(0);

    expect(rejected).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('reloaded') }),
    );
    connectLighterExecutor(executor);
    finishRead(null);
    await pending;
    await Promise.resolve();
    expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('retires connected execution when the bridge resets', async () => {
    jest.useFakeTimers();
    const executor = jest.fn(() => new Promise(() => undefined));
    connectLighterExecutor(executor);
    const rejected = jest.fn();
    const pending = lighterSignerBridge
      .execute({ function: '_createAuthToken', params: [28, 7] })
      .catch(rejected);
    await jest.advanceTimersByTimeAsync(0);
    expect(executor).toHaveBeenCalledTimes(1);

    resetLighterBridge();
    await jest.advanceTimersByTimeAsync(0);

    expect(rejected).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('reloaded') }),
    );
    await pending;
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

  it('keeps failing fast when reset follows terminal unavailability', async () => {
    // Regression: reset() cleared unavailableError and re-armed readiness, so a
    // controller reset after exhaustion left callers waiting on a signer page
    // that never remounts — they hung until the 90s deadline instead of
    // failing immediately.
    setLighterBridgeUnavailable('Lighter signer unavailable');
    resetLighterBridge();

    await expect(
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [28, 7],
      }),
    ).rejects.toThrow('Lighter signer unavailable');
  });

  it('serves calls again after an explicit revive', async () => {
    // Only a real host remount may revive the bridge.
    setLighterBridgeUnavailable('Lighter signer unavailable');
    reviveLighterBridge();

    const executor = jest.fn().mockResolvedValue({ token: 'ok', deadline: 1 });
    connectLighterExecutor(executor);

    await expect(
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [28, 7],
      }),
    ).resolves.toStrictEqual({ token: 'ok', deadline: 1 });
  });

  it('persists a generated key and keeps it inside createClient transport params', async () => {
    const executor = jest.fn().mockResolvedValue(clientResult);
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
  it('discovers persisted slots without generating or exposing private keys', async () => {
    mockSecureKeychain.getSecureItem.mockImplementation(async (scope) =>
      scope.service?.endsWith('.19')
        ? { key: 'LIGHTER_SIGNER_PRIVATE_KEY', value: 'a'.repeat(64) }
        : null,
    );

    const indices = await lighterSignerBridge.getStoredKeyIndices({
      chainId: 300,
      accountIndex: 28,
      apiKeyIndices: [7, 19],
    });

    expect(indices).toEqual([19]);
    expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
    expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    expect(mockSecureKeychain.getSecureItem).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'com.metamask.PERPS_LIGHTER_SIGNER.300.28.19',
      }),
    );
  });

  it('recreates the wallet-derived key after losing local storage', async () => {
    const exportAccount = jest.fn().mockResolvedValue('c'.repeat(64));
    jest
      .mocked(Engine.context.KeyringController.withKeyring)
      .mockImplementation(async (_selector, operation) =>
        operation({ keyring: { type: 'HD Key Tree', exportAccount } } as never),
      );
    const executor = jest.fn().mockResolvedValue(clientResult);
    connectLighterExecutor(executor);
    const params = { chainId: 300, accountIndex: 28, nonce: 9, apiKeyIndex: 7 };

    await lighterSignerBridge.createClient(params);
    resetLighterBridge();
    connectLighterExecutor(executor);
    await lighterSignerBridge.createClient(params);

    expect(executor.mock.calls.map(([call]) => call.params[0])).toEqual([
      'c'.repeat(64),
      'c'.repeat(64),
    ]);
    expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
    expect(exportAccount).toHaveBeenCalledWith(`0x${'1'.repeat(40)}`, {
      withAppKeyOrigin:
        'metamask-internal://perps/lighter/trading-key/v1/300/28',
    });
    expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('discovers wallet-recoverable slots without exporting keys', async () => {
    const exportAccount = jest.fn();
    jest
      .mocked(Engine.context.KeyringController.withKeyring)
      .mockImplementation(async (_selector, operation) =>
        operation({ keyring: { type: 'HD Key Tree', exportAccount } } as never),
      );

    expect(
      await lighterSignerBridge.getRecoverableKeyIndices({
        chainId: 300,
        accountIndex: 28,
        apiKeyIndices: [7, 19],
      }),
    ).toEqual([7, 19]);
    expect(exportAccount).not.toHaveBeenCalled();
    expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
  });

  describe('unreadable encrypted keys', () => {
    const params = { chainId: 300, accountIndex: 28, nonce: 9, apiKeyIndex: 7 };
    const discoveryParams = {
      chainId: 300,
      accountIndex: 28,
      apiKeyIndices: [7, 19],
    };
    const setSoftwareKeyring = (
      exportAccount = jest.fn().mockResolvedValue('c'.repeat(64)),
    ) => {
      jest
        .mocked(Engine.context.KeyringController.withKeyring)
        .mockImplementation(async (_selector, operation) =>
          operation({
            keyring: { type: 'HD Key Tree', exportAccount },
          } as never),
        );
      return exportAccount;
    };

    it('discovers healthy stored slots first and derives unreadable software slots without exports', async () => {
      const exportAccount = setSoftwareKeyring();
      mockSecureKeychain.getSecureItem.mockImplementation(async (scope) => {
        if (scope.service?.endsWith('.7'))
          throw new SecureKeychainDecryptionError();
        return { key: 'LIGHTER_SIGNER_PRIVATE_KEY', value: 'a'.repeat(64) };
      });

      const indices =
        await lighterSignerBridge.getRecoverableKeyIndices(discoveryParams);

      expect(indices).toEqual([19, 7]);
      expect(exportAccount).not.toHaveBeenCalled();
      expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
      expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    });

    it('recreates the same software key after a reset without replacing unreadable storage', async () => {
      const exportAccount = setSoftwareKeyring();
      mockSecureKeychain.getSecureItem.mockRejectedValue(
        new SecureKeychainDecryptionError(),
      );
      const executor = jest.fn().mockResolvedValue(clientResult);
      connectLighterExecutor(executor);

      await lighterSignerBridge.createClient(params);
      resetLighterBridge();
      connectLighterExecutor(executor);
      await lighterSignerBridge.createClient(params);

      expect(executor.mock.calls.map(([call]) => call.params[0])).toEqual([
        'c'.repeat(64),
        'c'.repeat(64),
      ]);
      expect(exportAccount).toHaveBeenCalledWith(`0x${'1'.repeat(40)}`, {
        withAppKeyOrigin:
          'metamask-internal://perps/lighter/trading-key/v1/300/28',
      });
      expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
      expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    });

    it('keeps public stored-key discovery strict for software wallets', async () => {
      setSoftwareKeyring();
      mockSecureKeychain.getSecureItem.mockRejectedValue(
        new SecureKeychainDecryptionError(),
      );

      await expect(
        lighterSignerBridge.getStoredKeyIndices(discoveryParams),
      ).rejects.toBeInstanceOf(SecureKeychainDecryptionError);

      expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
      expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    });

    it.each(['Ledger Hardware', 'Snap Keyring'])(
      'blocks %s recovery instead of generating a replacement',
      async (type) => {
        const exportAccount = jest.fn();
        jest
          .mocked(Engine.context.KeyringController.withKeyring)
          .mockImplementation(async (_selector, operation) =>
            operation({ keyring: { type, exportAccount } } as never),
          );
        mockSecureKeychain.getSecureItem.mockRejectedValue(
          new SecureKeychainDecryptionError(),
        );
        const executor = jest.fn();
        connectLighterExecutor(executor);

        await expect(
          lighterSignerBridge.getRecoverableKeyIndices(discoveryParams),
        ).rejects.toBeInstanceOf(SecureKeychainDecryptionError);
        await expect(
          lighterSignerBridge.createClient(params),
        ).rejects.toBeInstanceOf(SecureKeychainDecryptionError);

        expect(exportAccount).not.toHaveBeenCalled();
        expect(executor).not.toHaveBeenCalled();
        expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
        expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
      },
    );

    it('retains a healthy legacy software key without deriving a replacement', async () => {
      const exportAccount = setSoftwareKeyring();
      mockSecureKeychain.getSecureItem.mockResolvedValue({
        key: 'LIGHTER_SIGNER_PRIVATE_KEY',
        value: 'a'.repeat(64),
      });
      const executor = jest.fn().mockResolvedValue(clientResult);
      connectLighterExecutor(executor);

      await lighterSignerBridge.createClient(params);

      expect(executor).toHaveBeenCalledWith(
        expect.objectContaining({ params: ['a'.repeat(64), 300, 28, 9, 7] }),
        expect.any(Number),
      );
      expect(exportAccount).not.toHaveBeenCalled();
      expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    });

    it.each(['create', 'discover'])(
      'rejects a wallet lock during failed storage retrieval before %s fallback',
      async (operation) => {
        const exportAccount = setSoftwareKeyring();
        mockSecureKeychain.getSecureItem.mockImplementation(async () => {
          jest
            .mocked(Engine.context.KeyringController.isUnlocked)
            .mockReturnValue(false);
          throw new SecureKeychainDecryptionError();
        });

        const pending =
          operation === 'create'
            ? lighterSignerBridge.createClient(params)
            : lighterSignerBridge.getRecoverableKeyIndices(discoveryParams);

        await expect(pending).rejects.toThrow('wallet is locked');
        expect(exportAccount).not.toHaveBeenCalled();
        expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
        expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
      },
    );

    it.each(['Native keychain access denied', 'Unable to decrypt secure item'])(
      'blocks untyped read errors for software wallets: %s',
      async (message) => {
        const exportAccount = setSoftwareKeyring();
        mockSecureKeychain.getSecureItem.mockRejectedValue(new Error(message));
        const executor = jest.fn();
        connectLighterExecutor(executor);

        await expect(
          lighterSignerBridge.getRecoverableKeyIndices(discoveryParams),
        ).rejects.toThrow(message);
        await expect(lighterSignerBridge.createClient(params)).rejects.toThrow(
          message,
        );

        expect(exportAccount).not.toHaveBeenCalled();
        expect(executor).not.toHaveBeenCalled();
        expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
        expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
      },
    );

    it('blocks a failed software derivation without generating a replacement', async () => {
      setSoftwareKeyring(
        jest.fn().mockRejectedValue(new Error('Derivation unavailable')),
      );
      mockSecureKeychain.getSecureItem.mockRejectedValue(
        new SecureKeychainDecryptionError(),
      );
      const executor = jest.fn();
      connectLighterExecutor(executor);

      await expect(lighterSignerBridge.createClient(params)).rejects.toThrow(
        'Derivation unavailable',
      );

      expect(executor).not.toHaveBeenCalled();
      expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
      expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    });

    it.each(['create', 'discover'])(
      'rejects wallet changes during failed storage retrieval before %s fallback',
      async (operation) => {
        const exportAccount = setSoftwareKeyring();
        mockSecureKeychain.getSecureItem.mockImplementation(async () => {
          jest
            .mocked(Engine.context.AccountsController.getSelectedAccount)
            .mockReturnValue({
              address: `0x${'2'.repeat(40)}`,
              type: 'eip155:eoa',
            } as never);
          throw new SecureKeychainDecryptionError();
        });

        const pending =
          operation === 'create'
            ? lighterSignerBridge.createClient(params)
            : lighterSignerBridge.getRecoverableKeyIndices(discoveryParams);

        await expect(pending).rejects.toThrow('wallet changed');
        expect(exportAccount).not.toHaveBeenCalled();
        expect(QuickCrypto.randomBytes).not.toHaveBeenCalled();
        expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
      },
    );
  });

  it.each([null, { value: 'a'.repeat(64) }])(
    'uses the selected group EVM account with a non-EVM selection (stored: %s)',
    async (stored) => {
      jest
        .mocked(Engine.context.AccountsController.getSelectedAccount)
        .mockReturnValue({
          address: 'SolanaAddress',
          type: 'solana:data-account',
        } as never);
      mockSecureKeychain.getSecureItem.mockResolvedValue(stored as never);
      const executor = jest.fn().mockResolvedValue(clientResult);
      connectLighterExecutor(executor);

      await lighterSignerBridge.createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
        walletAddress: `0x${'1'.repeat(40)}`,
      });

      expect(executor).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects a wallet switch before the bridge call without reading or persisting a key', async () => {
    jest
      .mocked(Engine.context.AccountsController.getSelectedAccount)
      .mockReturnValue({
        address: `0x${'2'.repeat(40)}`,
        type: 'eip155:eoa',
      } as never);
    connectLighterExecutor(jest.fn().mockResolvedValue(clientResult));

    await expect(
      lighterSignerBridge.createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
        walletAddress: `0x${'1'.repeat(40)}`,
      }),
    ).rejects.toThrow('wallet changed');

    expect(mockSecureKeychain.getSecureItem).not.toHaveBeenCalled();
    expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('rejects a wallet switch during native key discovery', async () => {
    mockSecureKeychain.getSecureItem.mockImplementationOnce(async () => {
      jest
        .mocked(Engine.context.AccountsController.getSelectedAccount)
        .mockReturnValue({
          address: `0x${'2'.repeat(40)}`,
          type: 'eip155:eoa',
        } as never);
      return null;
    });

    await expect(
      lighterSignerBridge.getRecoverableKeyIndices({
        chainId: 300,
        accountIndex: 28,
        apiKeyIndices: [7],
        walletAddress: `0x${'1'.repeat(40)}`,
      }),
    ).rejects.toThrow('wallet changed');

    expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    expect(Engine.context.KeyringController.withKeyring).toHaveBeenCalledTimes(
      1,
    );
  });

  it('rejects a wallet switch during derivation before persisting the key', async () => {
    const exportAccount = jest.fn().mockImplementation(async () => {
      jest
        .mocked(Engine.context.AccountsController.getSelectedAccount)
        .mockReturnValueOnce({
          address: `0x${'2'.repeat(40)}`,
          type: 'eip155:eoa',
        } as never);
      return 'c'.repeat(64);
    });
    jest
      .mocked(Engine.context.KeyringController.withKeyring)
      .mockImplementation(async (_selector, operation) =>
        operation({ keyring: { type: 'HD Key Tree', exportAccount } } as never),
      );
    connectLighterExecutor(jest.fn());

    await expect(
      lighterSignerBridge.createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
      }),
    ).rejects.toThrow('wallet changed');
    expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('rejects slot discovery while the wallet is locked', async () => {
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(false);

    await expect(
      lighterSignerBridge.getStoredKeyIndices({
        chainId: 300,
        accountIndex: 28,
        apiKeyIndices: [7],
      }),
    ).rejects.toThrow('wallet is locked');

    expect(mockSecureKeychain.getSecureItem).not.toHaveBeenCalled();
  });

  it('reuses a valid stored key instead of generating a new one', async () => {
    const storedKey = 'a'.repeat(64);
    mockSecureKeychain.getSecureItem.mockResolvedValue({
      value: storedKey,
    } as Awaited<ReturnType<typeof SecureKeychain.getSecureItem>>);
    const executor = jest.fn().mockResolvedValue(clientResult);
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

  it.each([false, true])(
    'keeps one persisted key when setup overlaps a pending write (reset: %s)',
    async (reset) => {
      let stored: Awaited<ReturnType<typeof SecureKeychain.getSecureItem>> =
        null;
      let finishWrite!: () => void;
      const writing = new Promise<void>((resolve) => {
        finishWrite = resolve;
      });
      let notifyWrite!: () => void;
      const writeStarted = new Promise<void>((resolve) => {
        notifyWrite = resolve;
      });
      mockSecureKeychain.getSecureItem.mockImplementation(async () => stored);
      mockSecureKeychain.setSecureItem.mockImplementation(
        async (_key, value) => {
          notifyWrite();
          await writing;
          stored = { key: 'LIGHTER_SIGNER_PRIVATE_KEY', value };
          return {
            service: 'test',
            storage: 'KeystoreAESGCM_NoAuth',
          } as KeychainResult;
        },
      );
      const executor = jest.fn().mockResolvedValue(clientResult);
      connectLighterExecutor(executor);
      const params = {
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
      };

      const first = lighterSignerBridge
        .createClient(params)
        .catch((error: unknown) => error);
      await writeStarted;
      if (reset) {
        resetLighterBridge();
        connectLighterExecutor(executor);
      }
      const second = lighterSignerBridge.createClient(params);
      finishWrite();
      const firstResult = await first;
      if (reset) {
        expect(firstResult).toEqual(
          new Error('Lighter signer WebView reloaded; retry the operation'),
        );
      } else {
        expect(firstResult).toStrictEqual(clientResult);
      }
      await expect(second).resolves.toStrictEqual(clientResult);

      expect(QuickCrypto.randomBytes).toHaveBeenCalledTimes(1);
      expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledTimes(1);
      expect(executor).toHaveBeenCalledTimes(reset ? 1 : 2);
      const persisted = await mockSecureKeychain.getSecureItem({
        service: 'com.metamask.PERPS_LIGHTER_SIGNER.300.28.7',
      });
      for (const [call] of executor.mock.calls) {
        expect(call.params[0]).toBe(persisted?.value);
      }
    },
  );

  it('rejects an unrelated registration body before returning it to the controller', async () => {
    connectLighterExecutor(
      jest.fn().mockResolvedValue({
        ...clientResult,
        body: 'Approve an unrelated message',
      }),
    );

    const pending = lighterSignerBridge.createClient({
      chainId: 300,
      accountIndex: 28,
      nonce: 9,
      apiKeyIndex: 7,
    });

    await expect(pending).rejects.toThrow('does not match');
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

  it('allows another setup after a keychain write rejects', async () => {
    mockSecureKeychain.setSecureItem.mockRejectedValueOnce(
      new Error('Keychain write failed'),
    );
    connectLighterExecutor(jest.fn().mockResolvedValue(clientResult));
    const params = {
      chainId: 300,
      accountIndex: 28,
      nonce: 9,
      apiKeyIndex: 7,
    };

    await expect(lighterSignerBridge.createClient(params)).rejects.toThrow(
      'Keychain write failed',
    );
    await expect(
      lighterSignerBridge.createClient(params),
    ).resolves.toStrictEqual(clientResult);

    expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledTimes(2);
  });

  it('notifies reset listeners and stops after unsubscribe', () => {
    const listener = jest.fn();
    if (!lighterSignerBridge.onReset) {
      throw new Error('Mobile Lighter bridge must support reset listeners');
    }
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
    if (!lighterSignerBridge.onReset) {
      throw new Error('Mobile Lighter bridge must support reset listeners');
    }
    lighterSignerBridge.onReset(failing);
    lighterSignerBridge.onReset(healthy);

    expect(() => resetLighterBridge()).not.toThrow();
    expect(healthy).toHaveBeenCalledTimes(1);
  });
});
