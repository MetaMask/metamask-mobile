import { ImageSourcePropType } from 'react-native';
import AppConstants from '../../AppConstants';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';
import { DappClient } from './dapp-sdk-types';

const getDefaultBridgeParams = (clientInfo: DappClient) => ({
  getRpcMethodMiddleware: ({
    getProviderState,
    getSubjectInfo,
  }: {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getProviderState: any;
    getSubjectInfo: () => {
      origin: string;
      domain: string;
    };
  }) =>
    getRpcMethodMiddleware({
      // hostname:
      //   clientInfo.originatorInfo.url ?? clientInfo.originatorInfo.title,
      // channelId: clientInfo.clientId,
      getProviderState,
      getSubjectInfo,
      navigation: null, //props.navigation,
      // Website info
      subjectDisplayInfo: {
        title: clientInfo.originatorInfo?.title,
        icon: clientInfo.originatorInfo?.icon as ImageSourcePropType,
      },
      // Bookmarks
      isHomepage: () => false,
      // Show autocomplete
      fromHomepage: { current: false },
      // Wizard
      wizardScrollAdjusted: { current: false },
      tabId: '',
      analytics: {
        platform:
          clientInfo.originatorInfo.platform ??
          AppConstants.MM_SDK.UNKNOWN_PARAM,
      },
      toggleUrlModal: () => null,
      injectHomePageScripts: () => null,
    }),
});

export default getDefaultBridgeParams;
