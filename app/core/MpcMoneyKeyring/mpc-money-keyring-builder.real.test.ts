import { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import { buildRealMpcMoneyKeyringBuilder } from './mpc-money-keyring-builder';

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

const buildKeyring = () => {
  const getBearerToken = jest.fn().mockResolvedValue(TOKEN);
  const getPrimaryMnemonic = jest.fn().mockResolvedValue([109, 110, 101]);
  const keyring = buildRealMpcMoneyKeyringBuilder({
    getBearerToken,
    getPrimaryMnemonic,
  })() as unknown as {
    options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
  };
  return { options: keyring.options, getBearerToken, getPrimaryMnemonic };
};

describe('buildRealMpcMoneyKeyringBuilder', () => {
  afterEach(() => {
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
      cloudURL: 'https://mpc-service.dev-api.cx.metamask.io/v2',
      relayerURL:
        'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket',
    });
  });

  it('uses the bearer token as the profile token', async () => {
    const { options, getBearerToken } = buildKeyring();

    expect(await options.getProfileToken()).toBe(TOKEN);
    expect(getBearerToken).toHaveBeenCalled();
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
