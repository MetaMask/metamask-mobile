import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { hexToBytes } from '@metamask/utils';
import { mnemonicToSeed } from 'ethers/lib/utils';
import { KeyringControllerWithKeyringV2UnsafeAction } from '@metamask/keyring-controller';
import { KeyringType } from '@metamask/keyring-api/v2';
import { getMnemonicSeed } from './utils';

const TEST_MNEMONIC =
  'test test test test test test test test test test test ball';
const TEST_MNEMONIC_SEED = hexToBytes(mnemonicToSeed(TEST_MNEMONIC));

type FakeKeyring = {
  type: string;
  seed?: Uint8Array;
};

/**
 * Setup the messenger and mock `KeyringController:withKeyringV2Unsafe` to
 * return one of a small bench of fake v2 keyrings indexed by id/type.
 *
 * @param overrides - Override default keyring bench (e.g. omit seed).
 * @returns The messenger.
 */
function getMessenger(overrides: Partial<Record<string, FakeKeyring>> = {}) {
  const keyrings: Record<string, FakeKeyring> = {
    main: { type: KeyringType.Hd, seed: TEST_MNEMONIC_SEED },
    ledger: { type: 'ledger' },
    ...overrides,
  };

  const messenger = new Messenger<
    string,
    KeyringControllerWithKeyringV2UnsafeAction,
    never
  >({ namespace: MOCK_ANY_NAMESPACE });

  messenger.registerActionHandler(
    'KeyringController:withKeyringV2Unsafe',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((selector: any, operation: any) => {
      if ('type' in selector) {
        const entry = Object.entries(keyrings).find(
          ([, instance]) => instance.type === selector.type,
        );
        if (!entry) {
          throw new Error('Keyring not found.');
        }
        const [id, keyring] = entry;
        return operation({ keyring, metadata: { id, name: id } });
      }

      if ('id' in selector && keyrings[selector.id]) {
        return operation({
          keyring: keyrings[selector.id],
          metadata: { id: selector.id, name: selector.id },
        });
      }

      throw new Error('Keyring not found.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );

  return messenger;
}

describe('getMnemonicSeed', () => {
  it('uses the primary keyring when no source is passed', async () => {
    const messenger = getMessenger();
    expect(await getMnemonicSeed(messenger)).toStrictEqual(TEST_MNEMONIC_SEED);
  });

  it('throws if the primary keyring is unavailable', async () => {
    const messenger = getMessenger({
      main: { type: KeyringType.Hd },
    });
    await expect(getMnemonicSeed(messenger)).rejects.toThrow(
      'Primary keyring mnemonic unavailable.',
    );
  });

  it('finds the source by ID', async () => {
    const messenger = getMessenger();
    expect(await getMnemonicSeed(messenger, 'main')).toStrictEqual(
      TEST_MNEMONIC_SEED,
    );
  });

  it('throws if the source is not the right type', async () => {
    const messenger = getMessenger();
    await expect(getMnemonicSeed(messenger, 'ledger')).rejects.toThrow(
      'Entropy source with ID "ledger" not found.',
    );
  });

  it('throws if the keyring cannot be found', async () => {
    const messenger = getMessenger();
    await expect(getMnemonicSeed(messenger, 'foo')).rejects.toThrow(
      'Entropy source with ID "foo" not found.',
    );
  });
});
