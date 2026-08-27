import type {
  AccountGroupPayloadId,
  AccountTreePayload,
  AccountWalletPayloadId,
} from '@metamask/account-tree-controller';
import { mnemonicToSeed } from '@metamask/key-tree';
import { decodeMnemonicWords, toEntropySourceId } from '@metamask/keyring-sdk';

/**
 * Builds a minimal `AccountTreePayload` for E2E QR sync injection.
 *
 * Wallet and group IDs must match `HdKeyring.toEntropySourceId()` so
 * `AccountTreeController:importState` can match a vault restored from the
 * same mnemonic instead of treating it as a second HD wallet.
 */
export const buildTestAccountTreePayload = async ({
  mnemonic,
  walletName = 'Extension Wallet',
  accountName = 'Account 1',
}: {
  mnemonic: string;
  walletName?: string;
  accountName?: string;
}): Promise<AccountTreePayload> => {
  const normalizedMnemonic = mnemonic.trim();
  const seed = await mnemonicToSeed(normalizedMnemonic);
  const entropySourceId = await toEntropySourceId('mnemonic', seed);
  const walletId = `wallet:${entropySourceId}` as AccountWalletPayloadId;

  return {
    version: 1,
    wallets: [
      {
        id: walletId,
        type: 'mnemonic',
        value: Array.from(decodeMnemonicWords(normalizedMnemonic)),
        metadata: { name: walletName },
        groups: [
          {
            id: `${walletId}/0` as AccountGroupPayloadId,
            groupIndex: 0,
            metadata: {
              name: accountName,
              pinned: false,
              hidden: false,
            },
          },
        ],
      },
    ],
  };
};
