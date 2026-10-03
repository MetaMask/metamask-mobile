import { HdKeyring } from '@metamask/eth-hd-keyring';
import SimpleKeyring from '@metamask/eth-simple-keyring';
import { deriveLighterWalletKey } from './lighterWalletKey';

describe('deriveLighterWalletKey', () => {
  const params = { chainId: 300, accountIndex: 64, apiKeyIndex: 7, nonce: 0 };
  // Public test key, never a funded account.
  const privateKey = '1'.repeat(64);

  it('preserves the version-one public test derivation fixture', async () => {
    const keyring = new SimpleKeyring([privateKey]);
    const [address] = await keyring.getAccounts();

    expect(await deriveLighterWalletKey(keyring, address, params)).toBe(
      'e4817b9eb79dc1c71a2502d004c2ac42fdff412314545f522f0691af713dcd95',
    );
  });

  it('recreates the same trading key after restoring an imported account', async () => {
    const first = new SimpleKeyring([privateKey]);
    const second = new SimpleKeyring([privateKey]);
    const [address] = await first.getAccounts();

    const before = await deriveLighterWalletKey(first, address, params);
    const restored = await deriveLighterWalletKey(second, address, params);

    expect(before).toMatch(/^[0-9a-f]{64}$/u);
    expect(before).not.toBe(privateKey);
    expect(restored).toBe(before);
  });

  it('derives the same key for an HD account imported as a private key', async () => {
    const hd = new HdKeyring();
    await hd.deserialize({
      mnemonic: 'test test test test test test test test test test test junk',
      numberOfAccounts: 1,
    });
    const [address] = await hd.getAccounts();
    const imported = new SimpleKeyring([await hd.exportAccount(address)]);

    expect(await deriveLighterWalletKey(hd, address, params)).toBe(
      await deriveLighterWalletKey(imported, address, params),
    );
  });

  it('separates accounts, venue accounts and networks while preserving slot recovery', async () => {
    const keyring = new SimpleKeyring([privateKey, '2'.repeat(64)]);
    const [address, otherAddress] = await keyring.getAccounts();
    const baseline = await deriveLighterWalletKey(keyring, address, params);

    expect(
      await deriveLighterWalletKey(keyring, otherAddress, params),
    ).not.toBe(baseline);
    expect(
      await deriveLighterWalletKey(keyring, address, {
        ...params,
        chainId: 304,
      }),
    ).not.toBe(baseline);
    expect(
      await deriveLighterWalletKey(keyring, address, {
        ...params,
        accountIndex: 65,
      }),
    ).not.toBe(baseline);
    expect(
      await deriveLighterWalletKey(keyring, address, {
        ...params,
        apiKeyIndex: 19,
        nonce: 99,
      }),
    ).toBe(baseline);
  });

  it('never exports keys from unsupported keyrings', async () => {
    const keyring = { type: 'Ledger Hardware', exportAccount: jest.fn() };

    expect(
      await deriveLighterWalletKey(keyring, `0x${'1'.repeat(40)}`, params),
    ).toBeNull();
    expect(keyring.exportAccount).not.toHaveBeenCalled();
  });
});
