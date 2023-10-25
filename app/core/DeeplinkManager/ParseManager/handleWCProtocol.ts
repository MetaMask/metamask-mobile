import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';
import extractURLParams from './extractURLParams';

export function handleWCProtocol(
  handled: () => void,
  wcURL: string,
  origin: string,
  params: ReturnType<typeof extractURLParams>['params'],
) {
  handled();

  WC2Manager.getInstance()
    .then((WC2ManagerInstance) =>
      WC2ManagerInstance.connect({
        wcUri: wcURL,
        origin,
        redirectUrl: params?.redirect,
      }),
    )
    .catch((err) => {
      console.warn(`DeepLinkManager failed to connect`, err);
    });
}

export default handleWCProtocol;
