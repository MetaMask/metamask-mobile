import { signInAsync } from 'expo-apple-authentication';
import { IosAppleLoginHandler } from './apple';

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('react-native-quick-crypto', () => ({
  randomUUID: () => 'random-uuid',
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const mockSignInAsync = jest.mocked(signInAsync);

const baseOptions = {
  authServerUrl: 'https://auth.example.com',
  clientId: 'io.metamask.MetaMask',
  web3AuthNetwork: 'sapphire_devnet',
};

describe('IosAppleLoginHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInAsync.mockResolvedValue({
      identityToken: 'apple-id-token',
    } as Awaited<ReturnType<typeof signInAsync>>);
  });

  it('sends the caller nonce to Apple', async () => {
    const handler = new IosAppleLoginHandler({
      ...baseOptions,
      nonce: '0xbound-nonce',
    });

    await handler.login();

    expect(mockSignInAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: '0xbound-nonce' }),
    );
  });

  it('keeps the existing request when no nonce is supplied', async () => {
    const handler = new IosAppleLoginHandler(baseOptions);

    await handler.login();

    expect(mockSignInAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({ nonce: expect.anything() }),
    );
  });
});
