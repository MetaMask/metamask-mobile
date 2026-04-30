import { KeyringMetadata } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../Engine';
import { TangemKeyring } from './TangemKeyring';
import PAGINATION_OPERATIONS from '../../constants/pagination';
import { removeAccountsFromPermissions } from '../Permissions';

/**
 * Perform an operation with the Tangem keyring.
 *
 * If no Tangem keyring is found, one is created.
 *
 * Note: do not call KeyringController methods within the operation callback
 * to avoid deadlocks.
 */
export const withTangemKeyring = async <CallbackResult = void>(
  operation: (selectedKeyring: {
    keyring: TangemKeyring;
    metadata: KeyringMetadata;
  }) => Promise<CallbackResult>,
): Promise<CallbackResult> => {
  const keyringController = Engine.context.KeyringController;
  return await keyringController.withKeyring(
    { type: ExtendedKeyringTypes.tangem },
    operation,
    { createIfMissing: true },
  );
};

/**
 * Scan a Tangem card via NFC to retrieve card info and wallet public keys.
 * Uses #ensureScanned internally so the keyring handles key extraction.
 */
export const scanTangemCard = async () =>
  await withTangemKeyring(async ({ keyring }) => {
    const card = await keyring.bridge.scanCard();
    keyring.cardId = card.cardId;
    const secp256k1Wallet = card.wallets?.find((w) => w.curve === 'secp256k1');
    if (secp256k1Wallet) {
      keyring.walletPublicKey = secp256k1Wallet.publicKey;
      const derived = secp256k1Wallet.derivedKeys?.["m/44'/60'/0'/0/0"];
      if (derived?.publicKey) {
        keyring.derivedPublicKey = derived.publicKey;
      }
    }
    return card;
  });

/**
 * Get the Tangem card ID from the keyring.
 */
export const getTangemCardId = async (): Promise<string> =>
  await withTangemKeyring(async ({ keyring }) => keyring.getCardId());

/**
 * Check if the Tangem keyring has a connected card.
 */
export const isTangemConnected = async (): Promise<boolean> =>
  await withTangemKeyring(async ({ keyring }) => keyring.isConnected());

/**
 * Paginated account discovery on the Tangem card.
 *
 * @param operation - 0: first page, 1: next page, -1: previous page
 */
export const getTangemAccountsByOperation = async (
  operation: number,
): Promise<{ balance: string; address: string; index: number }[]> => {
  const accounts = await withTangemKeyring(async ({ keyring }) => {
    switch (operation) {
      case PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE:
        return await keyring.getPreviousPage();
      case PAGINATION_OPERATIONS.GET_NEXT_PAGE:
        return await keyring.getNextPage();
      default:
        return await keyring.getFirstPage();
    }
  });

  return accounts.map((account) => ({
    ...account,
    balance: '0x0',
  }));
};

/**
 * Get all Tangem accounts from the keyring.
 */
export const getTangemAccounts = async (): Promise<string[]> =>
  await withTangemKeyring(async ({ keyring }) => keyring.getAccounts());

/**
 * Unlock a Tangem wallet account and add it to MetaMask.
 *
 * @param index - The HD index of the account to unlock
 */
export const unlockTangemWalletAccount = async (index: number) => {
  const accountsController = Engine.context.AccountsController;

  const { unlockAccount, name } = await withTangemKeyring(
    async ({ keyring }) => {
      const existingAccounts = await keyring.getAccounts();
      const accountName = `Tangem ${existingAccounts.length + 1}`;

      keyring.setAccountToUnlock(index);
      const accounts = await keyring.addAccounts(1);
      return {
        unlockAccount: accounts[accounts.length - 1],
        name: accountName,
      };
    },
  );

  const account = accountsController.getAccountByAddress(unlockAccount);

  if (account && name !== account.metadata.name) {
    accountsController.setAccountName(account.id, name);
  }
  Engine.setSelectedAddress(unlockAccount);
};

/**
 * Forget the Tangem device, clearing all keyring state and permissions.
 */
export const forgetTangem = async (): Promise<void> => {
  await withTangemKeyring(async ({ keyring }) => {
    const accounts = await keyring.getAccounts();
    removeAccountsFromPermissions(accounts);
    keyring.forgetDevice();
  });
};

/**
 * Check NFC availability on the device.
 */
export const checkNfcStatus = async (): Promise<{
  enabled: boolean;
  support: boolean;
}> =>
  await withTangemKeyring(async ({ keyring }) => keyring.bridge.getNfcStatus());
