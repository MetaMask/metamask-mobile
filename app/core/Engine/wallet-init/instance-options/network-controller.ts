import { WalletOptions } from '@metamask/wallet';
import { INFURA_PROJECT_ID } from '../../../../constants/network';
import { getFailoverUrlsByChainId } from '../../../../util/networks/network-failover';
import {
  getRpcServiceEventsSampleRate,
  isPublicEndpointUrl,
} from '../../controllers/network-controller/utils';

export function getNetworkControllerInstanceOptions(): WalletOptions['instanceOptions']['networkController'] {
  return {
    infuraProjectId: INFURA_PROJECT_ID as string,
    failoverUrls: getFailoverUrlsByChainId(),
    analyticsOptions: {
      isRpcEndpointUrlPublic: (endpointUrl) =>
        isPublicEndpointUrl(endpointUrl, INFURA_PROJECT_ID as string),
      rpcServiceEventsSampleRate: getRpcServiceEventsSampleRate(),
    },
  };
}
