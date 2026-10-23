import { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import { sha256 } from '@noble/hashes/sha2';
import { buildRealMpcMoneyKeyringBuilder } from './mpc-money-keyring-builder';
import { applyEmptyIkmHkdfWorkaround } from './empty-ikm-hkdf-workaround';

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

jest.mock('./empty-ikm-hkdf-workaround', () => ({
  applyEmptyIkmHkdfWorkaround: jest.fn(),
}));

const toBase64Url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const TOKEN = `${toBase64Url({ alg: 'RS256' })}.${toBase64Url({ sub: 'profile-1' })}.sig`;

const buildKeyring = () => {
  const getBearerToken = jest.fn().mockResolvedValue(TOKEN);
  const keyring = buildRealMpcMoneyKeyringBuilder({ getBearerToken })() as {
    options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
  };
  return { options: keyring.options, getBearerToken };
};

describe('buildRealMpcMoneyKeyringBuilder', () => {
  it('is keyed by the MPC money keyring type', () => {
    const builder = buildRealMpcMoneyKeyringBuilder({
      getBearerToken: jest.fn(),
    });

    expect(builder.type).toBe('MPC Money Keyring');
  });

  it('applies the empty-IKM HKDF workaround', () => {
    buildRealMpcMoneyKeyringBuilder({ getBearerToken: jest.fn() });

    expect(applyEmptyIkmHkdfWorkaround).toHaveBeenCalled();
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

    expect(await options.getProfileToken({ twoFactor: true })).toBe(TOKEN);
    expect(getBearerToken).toHaveBeenCalled();
  });

  it('derives a 32-byte backup key from the profile id', async () => {
    const { options } = buildKeyring();

    expect(await options.getBackupEncryptionKey()).toStrictEqual(
      sha256(new TextEncoder().encode('mm-mobile-dev-backup:profile-1')),
    );
  });
});
