import { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import {
  buildRealMpcMoneyKeyringBuilder,
  setMpcTwoFactorTokenProvider,
} from './mpc-money-keyring-builder';

jest.mock('@metamask/eth-money-mpc-keyring', () => ({
  MpcMoneyKeyring: Object.assign(
    jest.fn().mockImplementation((options) => ({ options })),
    { type: 'MPC Money Keyring' },
  ),
}));

jest.mock('@metamask/mpc-react-native', () => ({
  cl24Lib: { name: 'cl24' },
  dkls23Lib: { name: 'dkls23' },
}));

const TOKEN = 'profile-token';

const buildKeyring = (
  build = buildRealMpcMoneyKeyringBuilder,
): {
  options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
  getBearerToken: jest.Mock<Promise<string>>;
  getPrimaryMnemonic: jest.Mock<Promise<number[]>>;
} => {
  const getBearerToken = jest.fn().mockResolvedValue(TOKEN);
  const getPrimaryMnemonic = jest.fn().mockResolvedValue([109, 110, 101]);
  const keyring = build({
    getBearerToken,
    getPrimaryMnemonic,
  })() as unknown as {
    options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
  };
  return { options: keyring.options, getBearerToken, getPrimaryMnemonic };
};

describe('buildRealMpcMoneyKeyringBuilder', () => {
  afterEach(() => {
    setMpcTwoFactorTokenProvider(undefined);
    jest.restoreAllMocks();
  });

  it('is keyed by the MPC money keyring type', () => {
    const builder = buildRealMpcMoneyKeyringBuilder({
      getBearerToken: jest.fn(),
      getPrimaryMnemonic: jest.fn(),
    });

    expect(builder.type).toBe('MPC Money Keyring');
  });

  it('builds the real keyring with the native TSS libraries and dev MPC service', () => {
    const { options } = buildKeyring();

    expect(options).toMatchObject({
      cl24Lib: { name: 'cl24' },
      dkls23Lib: { name: 'dkls23' },
      cloudURL: 'https://mpc-service.dev-api.cx.metamask.io/v1',
      relayerURL:
        'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket',
    });
  });

  it.each([
    [
      'unset',
      undefined,
      undefined,
      'https://mpc-service.dev-api.cx.metamask.io/v1',
      'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket',
    ],
    [
      'empty',
      '',
      '',
      'https://mpc-service.dev-api.cx.metamask.io/v1',
      'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket',
    ],
    [
      'custom',
      'https://mpc.example/v2',
      'wss://relay.example/websocket',
      'https://mpc.example/v2',
      'wss://relay.example/websocket',
    ],
  ])(
    'uses the expected endpoints for %s URL overrides',
    (_label, cloudURL, relayerURL, expectedCloudURL, expectedRelayerURL) => {
      const env = { ...process.env };
      if (cloudURL === undefined) {
        delete env.MM_MONEY_MPC_CLOUD_URL;
      } else {
        env.MM_MONEY_MPC_CLOUD_URL = cloudURL;
      }
      if (relayerURL === undefined) {
        delete env.MM_MONEY_MPC_RELAYER_URL;
      } else {
        env.MM_MONEY_MPC_RELAYER_URL = relayerURL;
      }
      jest.replaceProperty(process, 'env', env);

      jest.isolateModules(() => {
        const { buildRealMpcMoneyKeyringBuilder: build } = jest.requireActual<
          typeof import('./mpc-money-keyring-builder')
        >('./mpc-money-keyring-builder');

        const { options } = buildKeyring(build);

        expect(options.cloudURL).toBe(expectedCloudURL);
        expect(options.relayerURL).toBe(expectedRelayerURL);
      });
    },
  );

  it('uses the bearer token as the profile token', async () => {
    const { options, getBearerToken } = buildKeyring();

    expect(await options.getProfileToken({ twoFactor: true })).toBe(TOKEN);
    expect(getBearerToken).toHaveBeenCalled();
  });

  it('uses the 2FA token provider when the call needs 2FA', async () => {
    setMpcTwoFactorTokenProvider(jest.fn().mockResolvedValue('2fa-token'));
    const { options, getBearerToken } = buildKeyring();

    expect(await options.getProfileToken({ twoFactor: true })).toBe(
      '2fa-token',
    );
    expect(await options.getProfileToken()).toBe(TOKEN);
    expect(getBearerToken).toHaveBeenCalledTimes(1);
  });

  it('leaves MFA decisions to the backend', () => {
    const { options } = buildKeyring();

    expect(options).not.toHaveProperty('getMfaWhitelistConfig');
  });

  it('passes the primary mnemonic callback without deriving a backup key', async () => {
    const { options, getPrimaryMnemonic, getBearerToken } = buildKeyring();

    const mnemonic = await options.getPrimaryMnemonic();

    expect(options.getPrimaryMnemonic).toBe(getPrimaryMnemonic);
    expect(mnemonic).toStrictEqual([109, 110, 101]);
    expect(getPrimaryMnemonic).toHaveBeenCalledWith();
    expect(getBearerToken).not.toHaveBeenCalled();
    expect(options).not.toHaveProperty('getBackupEncryptionKey');
  });
});
