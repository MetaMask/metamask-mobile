import {
  WatchOnlyKeyring,
  WatchOnlyKeyringV1Adapter,
} from '@metamask/watch-only-keyring';
import {
  buildWatchOnlyKeyringBuilder,
  buildWatchOnlyKeyringV2Builder,
} from './watch-only-keyring-builder';

const ADDRESS = '0x5972698398d8c5bbe67c0db74906236691020417';

describe('buildWatchOnlyKeyringBuilder', () => {
  it('is keyed by the watch-only keyring type', () => {
    expect(buildWatchOnlyKeyringBuilder().type).toBe('watch-only');
  });

  it('builds a V1 adapter around a new watch-only keyring', () => {
    const keyring = buildWatchOnlyKeyringBuilder()();

    expect(keyring).toBeInstanceOf(WatchOnlyKeyringV1Adapter);
  });

  it('builds a keyring that refuses to sign', async () => {
    const adapter =
      buildWatchOnlyKeyringBuilder()() as unknown as WatchOnlyKeyringV1Adapter;
    await adapter.unwrap().deserialize({
      accounts: [
        { type: 'eip155:eoa', address: ADDRESS, scopes: ['eip155:0'] },
      ],
    });

    await expect(
      adapter.signPersonalMessage(ADDRESS, '0x68656c6c6f'),
    ).rejects.toThrow(/does not support method/u);
  });
});

describe('buildWatchOnlyKeyringV2Builder', () => {
  it('is keyed by the watch-only keyring type', () => {
    expect(buildWatchOnlyKeyringV2Builder().type).toBe(WatchOnlyKeyring.type);
  });

  it('unwraps the keyring held by the V1 adapter', () => {
    const adapter =
      buildWatchOnlyKeyringBuilder()() as unknown as WatchOnlyKeyringV1Adapter;

    const keyring = buildWatchOnlyKeyringV2Builder()(adapter as never, {
      id: 'metadata-id',
      name: 'name',
    });

    expect(keyring).toBe(adapter.unwrap());
    expect(keyring).toBeInstanceOf(WatchOnlyKeyring);
  });

  it('rejects any other keyring', () => {
    expect(() =>
      buildWatchOnlyKeyringV2Builder()({} as never, {
        id: 'metadata-id',
        name: 'name',
      }),
    ).toThrow('Expected WatchOnlyKeyringV1Adapter instance');
  });
});
