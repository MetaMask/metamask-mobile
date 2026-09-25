import { KeyringTypes } from '@metamask/keyring-controller';
import { WatchOnlyKeyring } from './WatchOnlyKeyring';

describe('WatchOnlyKeyring', () => {
  it('exposes the watch-only keyring type', () => {
    const keyring = new WatchOnlyKeyring();

    expect(keyring.type).toBe(KeyringTypes.watchOnly);
    expect(WatchOnlyKeyring.type).toBe(KeyringTypes.watchOnly);
  });

  it('starts with no accounts', async () => {
    const keyring = new WatchOnlyKeyring();

    const accounts = await keyring.getAccounts();

    expect(accounts).toEqual([]);
  });

  it('deserializes and lowercases the stored addresses', async () => {
    const keyring = new WatchOnlyKeyring();

    await keyring.deserialize({
      addresses: ['0xABCDEF1234567890ABCDEF1234567890ABCDEF12'],
    });
    const accounts = await keyring.getAccounts();

    expect(accounts).toEqual(['0xabcdef1234567890abcdef1234567890abcdef12']);
  });

  it('deserializes an empty state to no accounts', async () => {
    const keyring = new WatchOnlyKeyring();

    await keyring.deserialize(null);
    const accounts = await keyring.getAccounts();

    expect(accounts).toEqual([]);
  });

  it('serializes the current addresses', async () => {
    const keyring = new WatchOnlyKeyring();
    await keyring.deserialize({ addresses: ['0xabc'] });

    const serialized = await keyring.serialize();

    expect(serialized).toEqual({ addresses: ['0xabc'] });
  });

  it('rejects deriving new accounts', async () => {
    const keyring = new WatchOnlyKeyring();

    await expect(keyring.addAccounts()).rejects.toThrow(
      'WatchOnlyKeyring cannot derive accounts',
    );
  });

  it('removes a watched address', async () => {
    const keyring = new WatchOnlyKeyring();
    await keyring.deserialize({ addresses: ['0xabc', '0xdef'] });

    keyring.removeAccount('0xabc');
    const accounts = await keyring.getAccounts();

    expect(accounts).toEqual(['0xdef']);
  });

  it('throws when removing an address that was never watched', async () => {
    const keyring = new WatchOnlyKeyring();
    await keyring.deserialize({ addresses: ['0xabc'] });

    expect(() => keyring.removeAccount('0xdef')).toThrow(
      'Address 0xdef not found in WatchOnlyKeyring',
    );
  });

  it('exposes no signing methods', () => {
    const keyring = new WatchOnlyKeyring();

    expect(
      (keyring as unknown as Record<string, unknown>).signMessage,
    ).toBeUndefined();
    expect(
      (keyring as unknown as Record<string, unknown>).signPersonalMessage,
    ).toBeUndefined();
    expect(
      (keyring as unknown as Record<string, unknown>).signTransaction,
    ).toBeUndefined();
    expect(
      (keyring as unknown as Record<string, unknown>).signTypedData,
    ).toBeUndefined();
  });
});
