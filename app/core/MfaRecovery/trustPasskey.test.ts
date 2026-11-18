import Engine from '../Engine';
import StorageWrapper from '../../store/storage-wrapper';
import {
  forgetPendingPasskey,
  retryPendingPasskeys,
  trustPasskey,
} from './trustPasskey';

jest.mock('../Engine', () => ({
  context: {
    AuthenticationController: { getSessionProfile: jest.fn() },
    MfaRecoveryController: { trustIdentifier: jest.fn() },
  },
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
const getSessionProfile = jest.mocked(
  Engine.context.AuthenticationController.getSessionProfile,
);
const useProfile = (profileId: string) =>
  getSessionProfile.mockResolvedValue({ profileId } as never);
const PASSKEY = { credentialId: 'cred', attestationObject: 'att' };
const pending = async (profileId = 'profile-a') =>
  JSON.parse(
    (await StorageWrapper.getItem(
      `mfaRecoveryPendingPasskeyAttestations.${profileId}`,
    )) ?? '[]',
  );

describe('trustPasskey', () => {
  beforeEach(async () => {
    trustIdentifier.mockReset();
    useProfile('profile-a');
    await StorageWrapper.setItem(
      'mfaRecoveryPendingPasskeyAttestations.profile-a',
      '[]',
    );
  });

  it('records the passkey', async () => {
    trustIdentifier.mockResolvedValue(undefined);

    await trustPasskey(PASSKEY);

    expect(trustIdentifier).toHaveBeenCalledWith({
      type: 'passkey',
      attestationObject: 'att',
    });
    expect(await pending()).toStrictEqual([]);
  });

  it('keeps the passkey for a retry when recording fails', async () => {
    trustIdentifier.mockRejectedValue(new Error('offline'));

    await trustPasskey(PASSKEY);

    expect(await pending()).toStrictEqual([PASSKEY]);
  });

  it('records kept passkeys on retry and forgets them', async () => {
    trustIdentifier.mockRejectedValueOnce(new Error('offline'));
    await trustPasskey(PASSKEY);
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
    await trustPasskey(PASSKEY);

    await expect(retryPendingPasskeys()).rejects.toThrow('offline');
    expect(await pending()).toStrictEqual([PASSKEY]);
  });

  it('does not trust a removed passkey on retry', async () => {
    trustIdentifier.mockRejectedValueOnce(new Error('offline'));
    await trustPasskey(PASSKEY);
    trustIdentifier.mockResolvedValue(undefined);

    await forgetPendingPasskey('cred');
    await retryPendingPasskeys();

    expect(trustIdentifier).toHaveBeenCalledTimes(1);
    expect(await pending()).toStrictEqual([]);
  });

  it('does not retry passkeys another profile left pending', async () => {
    trustIdentifier.mockRejectedValueOnce(new Error('offline'));
    await trustPasskey(PASSKEY);
    trustIdentifier.mockResolvedValue(undefined);
    useProfile('profile-b');

    await retryPendingPasskeys();

    expect(trustIdentifier).toHaveBeenCalledTimes(1);
    expect(await pending('profile-a')).toStrictEqual([PASSKEY]);
  });
});
