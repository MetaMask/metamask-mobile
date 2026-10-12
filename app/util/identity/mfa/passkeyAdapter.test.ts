import { create, get } from 'react-native-passkeys';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
import { mobilePasskeyAdapter } from './passkeyAdapter';

jest.mock('react-native-passkeys', () => ({
  create: jest.fn(),
  get: jest.fn(),
}));

const mockCreate = jest.mocked(create);
const mockGet = jest.mocked(get);

const creationOptions = {
  rp: { id: 'authentication.api.cx.metamask.io', name: 'MetaMask' },
  user: { id: 'dXNlcg', name: 'profile', displayName: 'profile' },
  challenge: 'Y2hhbGxlbmdl',
  pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
};
const requestOptions = { challenge: 'Y2hhbGxlbmdl' };

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error) => getMfaErrorCode(error),
  );

describe('mobilePasskeyAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns what the passkey sheet returns', async () => {
    const attestation = { id: 'credential' };
    const assertion = { id: 'credential' };
    mockCreate.mockResolvedValue(attestation as never);
    mockGet.mockResolvedValue(assertion as never);

    expect(await mobilePasskeyAdapter.create(creationOptions)).toBe(
      attestation,
    );
    expect(await mobilePasskeyAdapter.get(requestOptions)).toBe(assertion);
    expect(mockCreate).toHaveBeenCalledWith(creationOptions);
    expect(mockGet).toHaveBeenCalledWith(requestOptions);
  });

  it.each([
    ['iOS', { code: 'ERR_USER_CANCELLED' }],
    ['Android', { code: 'Passkey Create', message: 'UserCancelled' }],
  ])(
    'reports a sheet dismissed on %s as cancelled',
    async (_platform, error) => {
      mockCreate.mockRejectedValue(error);
      mockGet.mockRejectedValue(error);

      expect(await codeOf(mobilePasskeyAdapter.create(creationOptions))).toBe(
        'passkey_ceremony_cancelled',
      );
      expect(await codeOf(mobilePasskeyAdapter.get(requestOptions))).toBe(
        'passkey_ceremony_cancelled',
      );
    },
  );

  it('reports any other failure or an empty response as an unusable passkey', async () => {
    mockCreate.mockRejectedValue(new Error('NotConfigured'));
    mockGet.mockResolvedValue(null);

    expect(await codeOf(mobilePasskeyAdapter.create(creationOptions))).toBe(
      'invalid_attestation',
    );
    expect(await codeOf(mobilePasskeyAdapter.get(requestOptions))).toBe(
      'invalid_assertion',
    );
  });
});
