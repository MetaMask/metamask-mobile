import { isPaymentLink } from '@reown/walletkit';
import { INTERNAL_ORIGINS } from '../../../../constants/transaction';
import WC2Manager from '../../../WalletConnect/WalletConnectV2';
import extractURLParams from '../../utils/extractURLParams';
import handleWalletConnectPay from './handleWalletConnectPay';

export function connectWithWC({
  handled,
  wcURL,
  origin,
  params,
}: {
  handled: () => void;
  wcURL: string;
  origin: string;
  params: ReturnType<typeof extractURLParams>['params'];
}) {
  handled();
  if (params.channelId && INTERNAL_ORIGINS.includes(params.channelId)) {
    throw new Error('External transactions cannot use internal origins');
  }

  if (isPaymentLink(wcURL)) {
    handleWalletConnectPay({ paymentUrl: wcURL });
    return;
  }

  WC2Manager.getInstance()
    .then((instance) =>
      instance.connect({
        wcUri: wcURL,
        origin,
        redirectUrl: params?.redirect,
      }),
    )
    .catch((err) => {
      console.warn(`connectWithWC failed`, err);
    });
}

export default connectWithWC;
