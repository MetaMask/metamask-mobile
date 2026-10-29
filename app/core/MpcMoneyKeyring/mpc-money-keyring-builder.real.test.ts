import { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import { sha256 } from '@noble/hashes/sha2';
import {
  buildRealMpcMoneyKeyringBuilder,
  MPC_MFA_WHITELIST_CONFIG,
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

const toBase64Url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const TOKEN = `${toBase64Url({ alg: 'RS256' })}.${toBase64Url({ sub: 'profile-1' })}.sig`;

const buildKeyring = (
  getTwoFactorApproval?: (hash: Uint8Array) => Promise<string>,
) => {
  const getBearerToken = jest.fn().mockResolvedValue(TOKEN);
  const keyring = buildRealMpcMoneyKeyringBuilder({
    getBearerToken,
    getTwoFactorApproval,
  })() as unknown as {
    options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
  };
  return { options: keyring.options, getBearerToken };
};

describe('buildRealMpcMoneyKeyringBuilder', () => {
  afterEach(() => {
    setMpcTwoFactorTokenProvider(undefined);
    jest.restoreAllMocks();
  });

  it('is keyed by the MPC money keyring type', () => {
    const builder = buildRealMpcMoneyKeyringBuilder({
      getBearerToken: jest.fn(),
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

  it('uses a 2FA approval for the signature hash when the call needs 2FA', async () => {
    const getTwoFactorApproval = jest.fn().mockResolvedValue('approval');
    const { options, getBearerToken } = buildKeyring(getTwoFactorApproval);
    const challenge = new Uint8Array(32).fill(1);

    expect(await options.getProfileToken({ twoFactor: true, challenge })).toBe(
      'approval',
    );
    expect(getTwoFactorApproval).toHaveBeenCalledWith(challenge);
    expect(await options.getProfileToken()).toBe(TOKEN);
    expect(getBearerToken).toHaveBeenCalledTimes(1);
  });

  it('prefers the QA 2FA token provider over the approval', async () => {
    setMpcTwoFactorTokenProvider(jest.fn().mockResolvedValue('2fa-token'));
    const getTwoFactorApproval = jest.fn();
    const { options } = buildKeyring(getTwoFactorApproval);

    expect(
      await options.getProfileToken({
        twoFactor: true,
        challenge: new Uint8Array(32),
      }),
    ).toBe('2fa-token');
    expect(getTwoFactorApproval).not.toHaveBeenCalled();
  });

  it('pins the Money Account whitelist config', async () => {
    const { options } = buildKeyring();

    expect(await options.getMfaWhitelistConfig?.()).toBe(
      MPC_MFA_WHITELIST_CONFIG,
    );
  });

  it('derives a 32-byte backup key from the profile id', async () => {
    const { options } = buildKeyring();

    expect(await options.getBackupEncryptionKey()).toStrictEqual(
      sha256(new TextEncoder().encode('mm-mobile-dev-backup:profile-1')),
    );
  });

  it('decodes a base64url profile token as base64', async () => {
    // This payload encodes to base64url with `-` and `_`.
    const sub = 'profile-??>>';
    const token = `${toBase64Url({ alg: 'RS256' })}.${toBase64Url({ sub })}.sig`;
    expect(token.split('.')[1]).toMatch(/[-_]/u);
    const from = jest.spyOn(Buffer, 'from');
    const keyring = buildRealMpcMoneyKeyringBuilder({
      getBearerToken: jest.fn().mockResolvedValue(token),
    })() as unknown as {
      options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
    };

    expect(await keyring.options.getBackupEncryptionKey()).toStrictEqual(
      sha256(new TextEncoder().encode(`mm-mobile-dev-backup:${sub}`)),
    );
    expect(from).toHaveBeenCalledWith(
      expect.not.stringMatching(/[-_]/u),
      'base64',
    );
  });
});
