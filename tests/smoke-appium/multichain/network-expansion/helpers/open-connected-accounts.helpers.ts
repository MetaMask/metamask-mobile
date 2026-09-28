import {
  Assertions,
  Gestures,
  Utilities,
} from '../../../../framework/index.js';
import AppiumContextHelpers from '../../../../framework/AppiumContextHelpers.js';
import BrowserView from '../../../../page-objects/Browser/BrowserView.js';
import ConnectedAccountsModal from '../../../../page-objects/Browser/ConnectedAccountsModal.js';
import DappConnectionModal from '../../../../page-objects/MMConnect/DappConnectionModal.js';
import NetworkListModal from '../../../../page-objects/Network/NetworkListModal.js';

/**
 * Opens the connected-accounts sheet after a dapp connection completes.
 *
 * The browser account button can briefly open the network selector while the
 * permitted account is propagating to the URL bar. Retry the targeted action
 * and dismiss only that known sheet, avoiding browser-history navigation.
 *
 * `account-list-bottom-sheet` and `connect-button` are both rendered by the
 * connect-permission sheet and the browser connected-accounts sheet, so the
 * connect-button disappear gate below is what proves the connect sheet closed
 * before the shared sheet ID is trusted.
 */
export async function openConnectedAccountsAfterConnect(): Promise<void> {
  await AppiumContextHelpers.switchToNativeContext();
  await Utilities.waitForElementToDisappear(
    DappConnectionModal.connectButton,
    15_000,
  );

  await Utilities.executeWithRetry(
    async () => {
      if (
        await Utilities.isElementVisible(
          ConnectedAccountsModal.accountListBottomSheet,
          500,
        )
      ) {
        return;
      }

      if (
        await Utilities.isElementVisible(NetworkListModal.selectNetwork, 500)
      ) {
        await NetworkListModal.swipeToDismissModal();
      }

      if (
        !(await Utilities.isElementVisible(
          BrowserView.networkAvatarOrAccountButton,
          1_500,
        ))
      ) {
        throw new Error(
          'Browser account button not visible after dapp connect',
        );
      }

      await Gestures.waitAndTap(BrowserView.networkAvatarOrAccountButton, {
        elemDescription: 'Network avatar or account button',
        timeout: 3_000,
      });
      await Assertions.expectElementToBeVisible(
        ConnectedAccountsModal.accountListBottomSheet,
        {
          timeout: 3_000,
          description: 'Connected accounts sheet after browser avatar tap',
        },
      );
    },
    {
      timeout: 30_000,
      interval: 500,
      description: 'Open connected-accounts sheet after dapp connect',
    },
  );
}
