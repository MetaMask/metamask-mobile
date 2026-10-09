/** Real Mobile key discovery and installed Core recovery, with native I/O mocked. */
import { buildLighterRecoveryHarness } from './lighter-recovery';
import Engine from '../../../../app/core/Engine';
import SecureKeychain from '../../../../app/core/SecureKeychain';
import { SecureKeychainDecryptionError } from '../../../../app/core/SecureKeychainError';
import {
  lighterSignerBridge,
  connectLighterExecutor,
  resetLighterBridge,
  type LighterExecutorCall,
} from '../../../../app/components/UI/Perps/Lighter/lighterSignerBridge';

jest.mock('../../../../app/core/SecureKeychain', () => ({
  __esModule: true,
  default: {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' },
    getSecureItem: jest.fn(),
    setSecureItem: jest.fn(),
  },
}));

/** Build a legacy unreadable slot beside a registered software-derived key. */
export function buildLighterMobileKeyRecoveryHarness() {
  const perps = buildLighterRecoveryHarness({
    signerBridge: lighterSignerBridge,
  });
  const binding = perps.bindEngine();
  const exportAccount = jest.fn().mockResolvedValue('c'.repeat(64));
  const keyringBinding = jest.replaceProperty(
    Engine.context,
    'KeyringController',
    {
      isUnlocked: () => true,
      withKeyring: async (
        _selector: unknown,
        operation: (value: unknown) => unknown,
      ) => operation({ keyring: { type: 'HD Key Tree', exportAccount } }),
    } as never,
  );
  const getSecureItem = jest.mocked(SecureKeychain.getSecureItem);
  const setSecureItem = jest.mocked(SecureKeychain.setSecureItem);
  getSecureItem.mockReset();
  setSecureItem.mockReset();
  getSecureItem.mockImplementation(async (scope) => {
    if (scope.service?.endsWith('.2'))
      throw new SecureKeychainDecryptionError();
    return null;
  });
  perps.responses.set('/api/v1/apikeys', {
    code: 200,
    apiKeys: [
      {
        accountIndex: perps.accountIndex,
        apiKeyIndex: 2,
        nonce: 0,
        publicKey: '77'.repeat(40),
      },
      {
        accountIndex: perps.accountIndex,
        apiKeyIndex: 3,
        nonce: 0,
        publicKey: '9c'.repeat(40),
      },
    ],
  });
  const executor = jest.fn(async (call: LighterExecutorCall) => {
    if (call.function === '_createAuthToken')
      return {
        token: 'synthetic-read-auth',
        deadline: Math.floor(Date.now() / 1000) + 600,
      };
    if (call.function !== '_createClient')
      throw new Error('Unexpected financial signer operation');
    const [privateKey, , accountIndex, nonce, apiKeyIndex] = call.params;
    if (privateKey !== 'c'.repeat(64))
      throw new Error('Unexpected derived key');
    const pk = '9c'.repeat(40);
    const hex = (value: unknown) => {
      if (typeof value !== 'number')
        throw new Error('Expected numeric signer parameter');
      return value.toString(16).padStart(16, '0');
    };
    return {
      success: true,
      pubKeySuccess: true,
      pk,
      body: `Register Lighter Account\n\npubkey: 0x${pk}\nnonce: 0x${hex(nonce)}\naccount index: 0x${hex(accountIndex)}\napi key index: 0x${hex(apiKeyIndex)}\nOnly sign this message for a trusted client!`,
    };
  });
  resetLighterBridge();
  connectLighterExecutor(executor);
  return {
    ...perps,
    native: { getSecureItem, setSecureItem, exportAccount, executor },
    reconnectSigner: () => {
      resetLighterBridge();
      connectLighterExecutor(executor);
    },
    teardown: async () => {
      await perps.teardown();
      resetLighterBridge();
      keyringBinding.restore();
      binding.restore();
    },
  };
}
