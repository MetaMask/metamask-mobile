import { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import {
  getMfaRequirement,
  type MfaRequirement,
} from '@metamask/money-account-mfa-whitelist';
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

jest.mock('@metamask/money-account-mfa-whitelist', () => ({
  getMfaRequirement: jest.fn(),
}));

jest.mock('@metamask/mpc-react-native', () => ({
  cl24Lib: { name: 'cl24' },
  dkls23Lib: { name: 'dkls23' },
}));

const toBase64Url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const ADDRESS = '0x1111111111111111111111111111111111111111' as const;
const HASH = `0x${'22'.repeat(32)}` as const;
const TOKEN = `${toBase64Url({ alg: 'RS256' })}.${toBase64Url({ sub: 'profile-1' })}.sig`;

const buildKeyring = () => {
  const getBearerToken = jest.fn().mockResolvedValue(TOKEN);
  const keyring = buildRealMpcMoneyKeyringBuilder({
    getBearerToken,
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

  it('falls back to the dev MPC service when the URL overrides are empty', () => {
    const original = {
      cloud: process.env.MM_MONEY_MPC_CLOUD_URL,
      relayer: process.env.MM_MONEY_MPC_RELAYER_URL,
    };
    process.env.MM_MONEY_MPC_CLOUD_URL = '';
    process.env.MM_MONEY_MPC_RELAYER_URL = '';
    let options: Record<string, unknown> = {};

    jest.isolateModules(() => {
      const { buildRealMpcMoneyKeyringBuilder: build } = jest.requireActual<
        typeof import('./mpc-money-keyring-builder')
      >('./mpc-money-keyring-builder');
      options = (
        build({ getBearerToken: jest.fn() })() as unknown as {
          options: Record<string, unknown>;
        }
      ).options;
    });

    process.env.MM_MONEY_MPC_CLOUD_URL = original.cloud;
    process.env.MM_MONEY_MPC_RELAYER_URL = original.relayer;
    expect(options).toMatchObject({
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

  it('checks signatures against the pinned whitelist config', async () => {
    const requirement = { mfaRequired: false, rule: 'chomp-authentication' };
    jest
      .mocked(getMfaRequirement)
      .mockReturnValue(requirement as MfaRequirement);
    const { options } = buildKeyring();
    const request = {
      method: 'signPersonalMessage',
      address: ADDRESS,
      message: '0x00',
    } as const;

    const result = await options.isMfaRequired?.(request, {
      address: ADDRESS,
      hash: HASH,
    });

    expect(result).toBe(false);
    expect(getMfaRequirement).toHaveBeenCalledWith(request, {
      address: ADDRESS,
      hash: HASH,
      config: MPC_MFA_WHITELIST_CONFIG,
    });
  });

  it('requires MFA when the whitelist does not match', async () => {
    jest
      .mocked(getMfaRequirement)
      .mockReturnValue({ mfaRequired: true, reason: 'not whitelisted' });
    const { options } = buildKeyring();

    const result = await options.isMfaRequired?.(
      { method: 'signPersonalMessage', address: ADDRESS, message: '0x00' },
      { address: ADDRESS, hash: HASH },
    );

    expect(result).toBe(true);
  });

  it('derives a 32-byte backup key from the profile id', async () => {
    const { options } = buildKeyring();

    expect(await options.getBackupEncryptionKey()).toStrictEqual(
      sha256(new TextEncoder().encode('mm-mobile-dev-backup:profile-1')),
    );
  });

  it('decodes a base64url profile token as base64', async () => {
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
