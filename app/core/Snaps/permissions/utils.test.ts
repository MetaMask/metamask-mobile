import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getMnemonicSeed } from './utils';
import { KeyringControllerWithKeyringV2Action } from '@metamask/keyring-controller';
import { HdKeyring as LegacyHdKeyring } from '@metamask/eth-hd-keyring';
import { HdKeyring } from '@metamask/eth-hd-keyring/v2';
import { LedgerKeyring as LegacyLedgerKeyring } from '@metamask/eth-ledger-bridge-keyring';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring/v2';
import { hexToBytes } from '@metamask/utils';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { mnemonicToSeed } from 'ethers/lib/utils';
import type { Keyring } from '@metamask/keyring-api/v2';

const TEST_MNEMONIC =
  'test test test test test test test test test test test ball';
const TEST_MNEMONIC_BYTES = mnemonicPhraseToBytes(TEST_MNEMONIC);
const TEST_MNEMONIC_SEED = hexToBytes(mnemonicToSeed(TEST_MNEMONIC));

/**
 * Setup the messenger and mock `KeyringController:withKeyringV2`.
 *
 * @param deserialize - Whether to deserialize the HD keyring state before returning.
 * @returns The messenger.
 */
async function getMessenger(deserialize = true) {
  const legacyHdKeyring = new LegacyHdKeyring();

  if (deserialize) {
    await legacyHdKeyring.deserialize({
      mnemonic: TEST_MNEMONIC,
    });
  }

  const hdKeyring = new HdKeyring({
    legacyKeyring: legacyHdKeyring,
    entropySource: 'main',
  });

  // @ts-expect-error Intentionally not passing in the bridge.
  const legacyLedgerKeyring = new LegacyLedgerKeyring({ bridge: {} });
  const ledgerKeyring = new LedgerKeyring({
    legacyKeyring: legacyLedgerKeyring,
    entropySource: 'ledger',
  });

  const keyrings: Record<string, Keyring> = {
    main: hdKeyring as unknown as Keyring,
    ledger: ledgerKeyring as unknown as Keyring,
  };

  const messenger = new Messenger<
    string,
    KeyringControllerWithKeyringV2Action,
    never
  >({ namespace: MOCK_ANY_NAMESPACE });
  messenger.registerActionHandler(
    'KeyringController:withKeyringV2',
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
