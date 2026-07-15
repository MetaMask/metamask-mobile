import AsyncStorage from '@react-native-async-storage/async-storage';
import { Passkey } from 'react-native-passkey';
import {
  buildPasskeyCreateRequest,
  buildPasskeyGetRequest,
  createDevPasskey,
  PASSKEY_RP_ID,
  verifyDevPasskey,
} from './passkeyDevTest';

jest.mock('react-native-quick-crypto', () => ({
  getRandomValues: (array: Uint8Array) => {
    array.fill(1);
    return array;
  },
}));

jest.mock('react-native-quick-base64', () => ({
  fromByteArray: () => 'AQIDBA',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('react-native-passkey', () => ({
  Passkey: {
    isSupported: jest.fn(() => true),
    createPlatformKey: jest.fn(),
    getPlatformKey: jest.fn(),
  },
}));

describe('passkeyDevTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue();
  });

  it('builds a create request for link.metamask.io', () => {
    const request = buildPasskeyCreateRequest('dXNlci1pZA');

    expect(request.rp.id).toBe(PASSKEY_RP_ID);
    expect(request.rp.id).toBe('link.metamask.io');
    expect(request.user.id).toBe('dXNlci1pZA');
    expect(request.challenge).toBeTruthy();
    expect(request.authenticatorSelection?.residentKey).toBe('required');
  });

  it('builds a get request with stored credential id when available', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockResolvedValueOnce('stored-credential-id');

    const request = await buildPasskeyGetRequest();

    expect(request.rpId).toBe('link.metamask.io');
    expect(request.allowCredentials).toEqual([
      { type: 'public-key', id: 'stored-credential-id' },
    ]);
  });

  it('creates and stores a dev passkey credential id', async () => {
    jest.mocked(Passkey.createPlatformKey).mockResolvedValue({
      id: 'new-credential-id',
      rawId: 'new-credential-id',
      response: {
        clientDataJSON: 'client-data',
        attestationObject: 'attestation-object',
      },
    });

    const result = await createDevPasskey();

    expect(result.id).toBe('new-credential-id');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'passkey_dev_test_user_id',
      expect.any(String),
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'passkey_dev_test_credential_id',
      'new-credential-id',
    );
  });

  it('verifies a dev passkey', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockResolvedValueOnce('stored-credential-id');
    jest.mocked(Passkey.getPlatformKey).mockResolvedValue({
      id: 'stored-credential-id',
      response: {
        authenticatorData: 'auth-data',
        clientDataJSON: 'client-data',
        signature: 'signature',
      },
    });

    const result = await verifyDevPasskey();

    expect(result.id).toBe('stored-credential-id');
    expect(Passkey.getPlatformKey).toHaveBeenCalledWith(
      expect.objectContaining({
        rpId: 'link.metamask.io',
        allowCredentials: [{ type: 'public-key', id: 'stored-credential-id' }],
      }),
    );
  });
});
