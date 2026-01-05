import { INTERNAL_ORIGINS } from '../../../../constants/transaction';
import WC2Manager from '../../../WalletConnect/WalletConnectV2';
import extractURLParams from '../../utils/extractURLParams';

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

  WC2Manager.getInstance()
    .then((instance) =>
      instance.connect({
        wcUri: wcURL,
        origin,
        redirectUrl: params?.redirect,
      }),
    )
    .catch((err) => {
      console.warn(`DeepLinkManager failed to connect`, err);
    });
}

export default connectWithWC;
