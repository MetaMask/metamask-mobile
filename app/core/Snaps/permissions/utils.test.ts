import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getMnemonic, getMnemonicSeed } from './utils';
import { KeyringControllerWithKeyringAction } from '@metamask/keyring-controller';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { hexToBytes } from '@metamask/utils';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { mnemonicToSeed } from 'ethers/lib/utils';
import { Keyring } from '@metamask/keyring-utils';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring';

const TEST_MNEMONIC =
  'test test test test test test test test test test test ball';
const TEST_MNEMONIC_BYTES = mnemonicPhraseToBytes(TEST_MNEMONIC);
const TEST_MNEMONIC_SEED = hexToBytes(mnemonicToSeed(TEST_MNEMONIC));

/**
 * Setup the messenger and mock `KeyringController:withKeyring`.
 *
 * @param deserialize - Whether to deserialize the HD keyring state before returning.
 * @returns The messenger.
 */
async function getMessenger(deserialize = true) {
  const hdKeyring = new HdKeyring();

  if (deserialize) {
    await hdKeyring.deserialize({
      mnemonic: TEST_MNEMONIC,
    });
  }

  // @ts-expect-error Intentionally not passing in the bridge.
  const ledgerKeyring = new LedgerKeyring({ bridge: {} });

  const keyrings: Record<string, Keyring> = {
    main: hdKeyring,
    ledger: ledgerKeyring,
  };

  const messenger = new Messenger<
    string,
    KeyringControllerWithKeyringAction,
    never
  >({ namespace: MOCK_ANY_NAMESPACE });
  messenger.registerActionHandler(
    'KeyringController:withKeyring',
    (selector, operation) => {
      if ('type' in selector) {
        const [id, keyring] = Object.entries(keyrings).filter(
          ([_, instance]) => instance.type === selector.type,
        )[selector.index ?? 0];
        return operation({ keyring, metadata: { id, name: id } });
      }

      if ('id' in selector && keyrings[selector.id]) {
        return operation({
          keyring: keyrings[selector.id],
          metadata: { id: selector.id, name: selector.id },
        });
      }

      throw new Error('Keyring not found.');
    },
  );

  return messenger;
}

describe('getMnemonic', () => {
  it('uses the primary keyring when no source is passed', async () => {
    const messenger = await getMessenger();
    expect(await getMnemonic(messenger)).toStrictEqual(TEST_MNEMONIC_BYTES);
  });

  it('throws if the primary keyring is unavailable', async () => {
    const messenger = await getMessenger(false);
    await expect(getMnemonic(messenger)).rejects.toThrow(
      'Primary keyring mnemonic unavailable.',
    );
  });

  it('finds the source by ID', async () => {
    const messenger = await getMessenger();
    expect(await getMnemonic(messenger, 'main')).toStrictEqual(
      TEST_MNEMONIC_BYTES,
    );
  });

  it('throws if the source is not the right type', async () => {
    const messenger = await getMessenger();
    await expect(getMnemonic(messenger, 'ledger')).rejects.toThrow(
      'Entropy source with ID "ledger" not found.',
    );
  });

  it('throws if the keyring cannot be found', async () => {
    const messenger = await getMessenger();
    await expect(getMnemonic(messenger, 'foo')).rejects.toThrow(
      'Entropy source with ID "foo" not found.',
    );
  });
});

describe('getMnemonicSeed', () => {
  it('uses the primary keyring when no source is passed', async () => {
    const messenger = await getMessenger();
    expect(await getMnemonicSeed(messenger)).toStrictEqual(TEST_MNEMONIC_SEED);
  });

  it('throws if the primary keyring is unavailable', async () => {
    const messenger = await getMessenger(false);
    await expect(getMnemonicSeed(messenger)).rejects.toThrow(
      'Primary keyring mnemonic unavailable.',
    );
  });

  it('finds the source by ID', async () => {
    const messenger = await getMessenger();
    expect(await getMnemonicSeed(messenger, 'main')).toStrictEqual(
      TEST_MNEMONIC_SEED,
    );
  });

  it('throws if the source is not the right type', async () => {
    const messenger = await getMessenger();
    await expect(getMnemonicSeed(messenger, 'ledger')).rejects.toThrow(
      'Entropy source with ID "ledger" not found.',
    );
  });

  it('throws if the keyring cannot be found', async () => {
    const messenger = await getMessenger();
    await expect(getMnemonicSeed(messenger, 'foo')).rejects.toThrow(
      'Entropy source with ID "foo" not found.',
    );
  });
});
