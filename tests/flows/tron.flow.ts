import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Matchers from '../framework/Matchers';
import WalletView from '../page-objects/wallet/WalletView';
import TronSendView from '../page-objects/Tron/TronSendView';

/**
 * Select the Tron network from the network selector.
 */
export async function selectTronNetwork(): Promise<void> {
  await WalletView.tapNetworksButtonOnNavBar();
  const tronMainnet = Matchers.getElementByText('Tron Mainnet');
  await Assertions.expectElementToBeVisible(tronMainnet);
  await Gestures.waitAndTap(tronMainnet, {
    elemDescription: 'Tron Mainnet network item',
  });

  try {
    await Gestures.waitAndTap(Matchers.getElementByText('Got it'), {
      elemDescription: 'Network education Got it button',
    });
  } catch {
    // The education modal does not always appear.
  }
}

/**
 * Complete the Tron send flow through submission.
 */
export async function sendTrx(
  address: string,
  amount: string,
): Promise<void> {
  await TronSendView.fillAmount(amount);
  await TronSendView.tapContinue();
  await TronSendView.fillRecipient(address);
  await TronSendView.tapReview();
}
