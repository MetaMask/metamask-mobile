import {
  MpcMoneyKeyring as MpcMoneyKeyringV2,
  type MpcMoneyKeyringOptions,
} from '@metamask/eth-money-mpc-keyring/v2';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import { getMfaRequirement } from '@metamask/money-account-mfa-whitelist';
import { bytesToHex, concatBytes, stringToBytes } from '@metamask/utils';
import { keccak_256 } from '@noble/hashes/sha3';
import { MpcMoneyKeyring } from './MpcMoneyKeyring';
import {
  MPC_MFA_WHITELIST_CONFIG,
  buildMpcMoneyKeyringBuilder,
  buildMpcMoneyKeyringV2Builder,
} from './mpc-money-keyring-builder';

const STATIC_ADDRESS = '0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd';

describe('buildMpcMoneyKeyringBuilder', () => {
  const originalAddress = process.env.MM_MONEY_MPC_ADDRESS;

  afterEach(() => {
    if (originalAddress === undefined) {
      delete process.env.MM_MONEY_MPC_ADDRESS;
    } else {
      process.env.MM_MONEY_MPC_ADDRESS = originalAddress;
    }
  });

  it('is keyed by the MPC money keyring type', () => {
    expect(buildMpcMoneyKeyringBuilder().type).toBe(MpcMoneyKeyring.type);
    expect(buildMpcMoneyKeyringBuilder().type).toBe('MPC Money Keyring');
  });

  it('builds the local V1 stub', () => {
    expect(buildMpcMoneyKeyringBuilder()()).toBeInstanceOf(MpcMoneyKeyring);
  });

  it('serves the static address configured through MM_MONEY_MPC_ADDRESS', async () => {
    process.env.MM_MONEY_MPC_ADDRESS = STATIC_ADDRESS;
    const keyring = buildMpcMoneyKeyringBuilder()();

    await expect(keyring.getAccounts()).resolves.toStrictEqual([
      STATIC_ADDRESS,
    ]);
  });
});

describe('buildMpcMoneyKeyringV2Builder', () => {
  const originalAddress = process.env.MM_MONEY_MPC_ADDRESS;

  afterEach(() => {
    if (originalAddress === undefined) {
      delete process.env.MM_MONEY_MPC_ADDRESS;
    } else {
      process.env.MM_MONEY_MPC_ADDRESS = originalAddress;
    }
  });

  it('is keyed by the legacy MPC money keyring type, which is how the controller dispatches it', () => {
    expect(buildMpcMoneyKeyringV2Builder().type).toBe(MpcMoneyKeyring.type);
  });

  it('wraps the legacy keyring passed to it', async () => {
    const legacyKeyring = buildMpcMoneyKeyringBuilder()();

    const wrapper = buildMpcMoneyKeyringV2Builder()(
      legacyKeyring as MpcMoneyKeyringOptions['legacyKeyring'],
      { id: 'ignored-metadata-id', name: '' },
    );

    expect(wrapper).toBeInstanceOf(MpcMoneyKeyringV2);
    // No static address is configured, so the keyring serves no accounts.
    await expect(wrapper.getAccounts()).resolves.toStrictEqual([]);
  });

  it('maps the static address served by the stub to an EOA account with MPC entropy', async () => {
    process.env.MM_MONEY_MPC_ADDRESS = STATIC_ADDRESS;
    const wrapper = new MpcMoneyKeyringV2({
      legacyKeyring: new MpcMoneyKeyring(),
    });

    const accounts = await wrapper.getAccounts();

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      type: EthAccountType.Eoa,
      address: STATIC_ADDRESS,
      scopes: [EthScope.Eoa],
      options: {
        entropy: {
          type: 'mpc',
        },
      },
    });
    expect(typeof accounts[0].id).toBe('string');
  });

  it('createAccounts returns the existing account served by the stub, without running the MPC setup', async () => {
    process.env.MM_MONEY_MPC_ADDRESS = STATIC_ADDRESS;
    const legacyKeyring = new MpcMoneyKeyring();
    const setupSpy = jest.spyOn(legacyKeyring, 'setup');
    const wrapper = new MpcMoneyKeyringV2({ legacyKeyring });

    await expect(
      wrapper.createAccounts({ type: 'custom' }),
    ).resolves.toHaveLength(1);

    expect(setupSpy).not.toHaveBeenCalled();
  });

  it('deleting accounts is not supported', async () => {
    const wrapper = new MpcMoneyKeyringV2({
      legacyKeyring: new MpcMoneyKeyring(),
    });

    await expect(
      wrapper.deleteAccount('7f392e73-9dbb-4ac8-a912-25f0bfa944ae'),
    ).rejects.toThrow('MpcMoneyKeyring: deleting accounts is not supported');
  });
});

describe('MPC_MFA_WHITELIST_CONFIG', () => {
  const successor = '0x1111111111111111111111111111111111111111';
  const predecessor = '0x2222222222222222222222222222222222222222';
  const now = Date.parse('2026-11-24T10:00:00.000Z');

  const buildSuccessorMessage = (domain: string) =>
    [
      `${domain} wants you to sign in with your Ethereum account:`,
      successor,
      '',
      `Associate ${successor} as the successor of ${predecessor} for CHOMP Money Account migration.`,
      '',
      `URI: https://${domain}/`,
      'Version: 1',
      'Chain ID: 143',
      'Nonce: abc123',
      'Issued At: 2026-11-24T09:59:00.000Z',
      'Expiration Time: 2026-11-24T10:04:00.000Z',
      'Request ID: req-1',
      'Resources:',
      '- urn:chomp:profile:profile-1',
      '- urn:chomp:purpose:ASSOCIATE_SUCCESSOR',
      `- urn:chomp:predecessor:${predecessor}`,
    ].join('\n');

  const getRequirement = (domain: string) => {
    const bytes = stringToBytes(buildSuccessorMessage(domain));
    const hash = bytesToHex(
      keccak_256(
        concatBytes([
          stringToBytes(`\x19Ethereum Signed Message:\n${bytes.length}`),
          bytes,
        ]),
      ),
    );
    return getMfaRequirement(
      {
        method: 'signPersonalMessage',
        address: successor,
        message: bytesToHex(bytes),
      },
      { address: successor, hash, config: MPC_MFA_WHITELIST_CONFIG, now },
    );
  };

  it('skips 2FA for the CHOMP successor association message', () => {
    expect(getRequirement('chomp.dev-api.cx.metamask.io')).toStrictEqual({
      mfaRequired: false,
      rule: 'chomp-successor-association',
    });
  });

  it('requires 2FA for a successor association message from another domain', () => {
    expect(getRequirement('example.com').mfaRequired).toBe(true);
  });
});
