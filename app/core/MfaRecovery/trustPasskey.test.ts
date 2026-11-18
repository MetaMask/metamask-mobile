import Engine from '../Engine';
import StorageWrapper from '../../store/storage-wrapper';
import { retryPendingPasskeys, trustPasskey } from './trustPasskey';

jest.mock('../Engine', () => ({
  context: { MfaRecoveryController: { trustIdentifier: jest.fn() } },
}));

jest.mock('../../store/storage-wrapper', () => {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
});

jest.mock('../../util/Logger', () => ({ error: jest.fn() }));

const trustIdentifier = jest.mocked(
  Engine.context.MfaRecoveryController.trustIdentifier,
);
const pending = async () =>
  JSON.parse(
    (await StorageWrapper.getItem('mfaRecoveryPendingPasskeyAttestations')) ??
      '[]',
  );

describe('trustPasskey', () => {
  beforeEach(async () => {
    trustIdentifier.mockReset();
    await StorageWrapper.setItem('mfaRecoveryPendingPasskeyAttestations', '[]');
  });

  it('records the passkey', async () => {
    trustIdentifier.mockResolvedValue(undefined);

    await trustPasskey('att');

    expect(trustIdentifier).toHaveBeenCalledWith({
      type: 'passkey',
      attestationObject: 'att',
    });
    expect(await pending()).toStrictEqual([]);
  });

  it('keeps the passkey for a retry when recording fails', async () => {
    trustIdentifier.mockRejectedValue(new Error('offline'));

    await trustPasskey('att');

    expect(await pending()).toStrictEqual(['att']);
  });

  it('records kept passkeys on retry and forgets them', async () => {
    trustIdentifier.mockRejectedValueOnce(new Error('offline'));
    await trustPasskey('att');
    trustIdentifier.mockResolvedValue(undefined);

    await retryPendingPasskeys();

    expect(trustIdentifier).toHaveBeenLastCalledWith({
      type: 'passkey',
      attestationObject: 'att',
    });
    expect(await pending()).toStrictEqual([]);
  });

  it('keeps passkeys that still fail on retry', async () => {
    trustIdentifier.mockRejectedValue(new Error('offline'));
    await trustPasskey('att');

    await expect(retryPendingPasskeys()).rejects.toThrow('offline');
    expect(await pending()).toStrictEqual(['att']);
  });
});
