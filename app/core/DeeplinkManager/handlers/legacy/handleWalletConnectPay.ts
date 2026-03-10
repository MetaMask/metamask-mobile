import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../../WalletConnect/WalletConnectV2';

interface HandleWalletConnectPayParams {
  paymentUrl: string;
}

/**
 * Handles WalletConnect Pay payment links
 *
 * Payment links are HTTPS URLs from pay.walletconnect.com
 * Example: https://pay.walletconnect.com/?pid=xxx
 *
 * @param params Object containing the payment URL
 * @param params.paymentUrl - The full payment URL
 */
export async function handleWalletConnectPay({
  paymentUrl,
}: HandleWalletConnectPayParams): Promise<void> {
  try {
    DevLogger.log(
      `handleWalletConnectPay: Processing payment link: ${paymentUrl}`,
    );

    const wc2Manager = await WC2Manager.getInstance();
    const walletKit = wc2Manager.getWalletKit();

    if (!walletKit?.pay) {
      Logger.error(
        new Error('WalletKit Pay is not available'),
        'handleWalletConnectPay: Pay not initialized',
      );
      return;
    }

    NavigationService.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.WALLET_CONNECT_PAY.PAYMENT_MODAL,
      params: {
        paymentUrl,
      },
    });
  } catch (error) {
    Logger.error(
      error as Error,
      'handleWalletConnectPay: Error processing payment link',
    );
  }
}

export default handleWalletConnectPay;
