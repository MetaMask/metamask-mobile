import ConnectedAccountsModal from '../../../../page-objects/Browser/ConnectedAccountsModal.js';

/**
 * Opens the connected-accounts sheet after a dapp connection completes.
 *
 * Delegates to {@link ConnectedAccountsModal.openFromBrowser} with the
 * connect-sheet closed gate — `account-list-bottom-sheet` is shared with the
 * connect-permission sheet, so that ID must not be trusted until Connect is gone.
 */
export async function openConnectedAccountsAfterConnect(): Promise<void> {
  await ConnectedAccountsModal.openFromBrowser({
    waitForConnectSheetClosed: true,
  });
}
