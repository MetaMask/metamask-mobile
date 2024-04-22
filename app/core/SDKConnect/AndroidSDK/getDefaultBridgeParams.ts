import AppConstants from '../../AppConstants';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';
import { DappClient } from './dapp-sdk-types';

const getDefaultBridgeParams = (clientInfo: DappClient) => ({
  getApprovedHosts: (host: string) => ({
    [host]: true,
  }),
  remoteConnHost:
    clientInfo.originatorInfo.url ?? clientInfo.originatorInfo.title,
  getRpcMethodMiddleware: ({
    getProviderState,
  }: {
    hostname: string;
    getProviderState: any;
  }) =>
    getRpcMethodMiddleware({
      hostname:
        clientInfo.originatorInfo.url ?? clientInfo.originatorInfo.title,
      channelId: clientInfo.clientId,
      getProviderState,
      isMMSDK: true,
      navigation: null, //props.navigation,
      getApprovedHosts: (host: string) => ({
        [host]: true,
      }),
      setApprovedHosts: () => true,
      approveHost: () => ({}),
      // Website info
      url: {
        current: clientInfo.originatorInfo?.url,
      },
      title: {
        current: clientInfo.originatorInfo?.title,
      },
      icon: {
        current: clientInfo.originatorInfo?.icon,
      },
      // Bookmarks
      isHomepage: () => false,
      // Show autocomplete
      fromHomepage: { current: false },
      // Wizard
      wizardScrollAdjusted: { current: false },
      tabId: '',
      isWalletConnect: false,
      analytics: {
        isRemoteConn: true,
        platform:
          clientInfo.originatorInfo.platform ??
          AppConstants.MM_SDK.UNKNOWN_PARAM,
      },
      toggleUrlModal: () => null,
      injectHomePageScripts: () => null,
    }),
  isMainFrame: true,
  isWalletConnect: false,
  wcRequestActions: undefined,
});

export default getDefaultBridgeParams;
