import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Utilities from '../framework/Utilities';
import AppiumContextHelpers from '../framework/AppiumContextHelpers';
import BrowserView from '../page-objects/Browser/BrowserView';
import ConnectedAccountsModal from '../page-objects/Browser/ConnectedAccountsModal';
import DappConnectionModal from '../page-objects/MMConnect/DappConnectionModal';
import NetworkListModal from '../page-objects/Network/NetworkListModal';
import ToastModal from '../page-objects/wallet/ToastModal';

interface OpenConnectedAccountsOptions {
  waitForConnectionModalToClose?: boolean;
}

/**
 * Opens the browser connected-accounts sheet after provider state settles.
 *
 * During propagation the browser header can still represent the previous
 * network. A tap then opens the network selector, or is swallowed by the
 * permissions toast. Retry only these known transient states and prove the
 * connected-accounts sheet opened before returning.
 */
export async function openConnectedAccounts({
  waitForConnectionModalToClose = false,
}: OpenConnectedAccountsOptions = {}): Promise<void> {
  await AppiumContextHelpers.switchToNativeContext();

  if (waitForConnectionModalToClose) {
    await Utilities.waitForElementToDisappear(
      DappConnectionModal.connectButton,
      15_000,
    );
  }

  await ToastModal.waitForToastToDismiss();

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
        throw new Error(
          'Network selector opened while provider state was settling',
        );
      }

      if (
        !(await Utilities.isElementVisible(
          BrowserView.networkAvatarOrAccountButton,
          1_500,
        ))
      ) {
        throw new Error(
          'Browser account button not visible after provider connection',
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
      description: 'Open connected-accounts sheet after provider settles',
    },
  );
}
