import type { Hex } from '@metamask/utils';
import { MpcMoneyKeyring } from './MpcMoneyKeyring';

const STATIC_ADDRESS = '0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd';

describe('MpcMoneyKeyring (stub)', () => {
  const originalAddress = process.env.MM_MONEY_MPC_ADDRESS;

  afterEach(() => {
    if (originalAddress === undefined) {
      delete process.env.MM_MONEY_MPC_ADDRESS;
    } else {
      process.env.MM_MONEY_MPC_ADDRESS = originalAddress;
    }
  });

  it('is keyed by the MPC money keyring type', () => {
    expect(MpcMoneyKeyring.type).toBe('MPC Money Keyring');
    expect(new MpcMoneyKeyring().type).toBe('MPC Money Keyring');
  });

  it('returns the static address configured through MM_MONEY_MPC_ADDRESS', async () => {
    process.env.MM_MONEY_MPC_ADDRESS = STATIC_ADDRESS;

    await expect(new MpcMoneyKeyring().getAccounts()).resolves.toStrictEqual([
      STATIC_ADDRESS,
    ]);
  });

  it('returns no accounts when no static address is configured', async () => {
    delete process.env.MM_MONEY_MPC_ADDRESS;

    await expect(new MpcMoneyKeyring().getAccounts()).resolves.toStrictEqual(
      [],
    );
  });

  it('throws when the configured static address is not a valid hex address', async () => {
    process.env.MM_MONEY_MPC_ADDRESS = 'not-an-address';

    await expect(new MpcMoneyKeyring().getAccounts()).rejects.toThrow(
      'MM_MONEY_MPC_ADDRESS must be a valid hex address',
    );
  });

  it('addAccounts is a noop', async () => {
    await expect(new MpcMoneyKeyring().addAccounts()).resolves.toStrictEqual(
      [],
    );
    await expect(new MpcMoneyKeyring().addAccounts(2)).resolves.toStrictEqual(
      [],
    );
  });

  it('serialize returns an empty object', async () => {
    await expect(new MpcMoneyKeyring().serialize()).resolves.toStrictEqual({});
  });

  it('deserialize is a noop', async () => {
    const keyring = new MpcMoneyKeyring();

    await expect(
      keyring.deserialize({ some: 'state' }),
    ).resolves.toBeUndefined();
  });

  it('init is a noop', async () => {
    const keyring = new MpcMoneyKeyring();

    await expect(keyring.init()).resolves.toBeUndefined();
    await expect(keyring.init('create')).resolves.toBeUndefined();
  });

  it('key share methods are not implemented', async () => {
    const keyring = new MpcMoneyKeyring();

    await expect(keyring.rotateKeyShares()).rejects.toThrow('Not implemented');
    await expect(keyring.checkKeyShare()).rejects.toThrow('Not implemented');
    await expect(keyring.syncKeyShare()).rejects.toThrow('Not implemented');
  });

  it('signing methods are not implemented', async () => {
    const keyring = new MpcMoneyKeyring();
    const address = STATIC_ADDRESS as Hex;

    await expect(
      keyring.getAppKeyAddress(address, 'https://example.com'),
    ).rejects.toThrow('Not implemented');
    await expect(
      keyring.signPersonalMessage(address, '0xdeadbeef'),
    ).rejects.toThrow('Not implemented');
    await expect(keyring.signTypedData(address, {})).rejects.toThrow(
      'Not implemented',
    );
    await expect(
      keyring.signEip7702Authorization(address, [1, address, 0]),
    ).rejects.toThrow('Not implemented');
  });
});
