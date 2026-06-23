import { WalletOptions } from '@metamask/wallet';
import { INFURA_PROJECT_ID } from '../../../../constants/network';
import { getFailoverUrlsForInfuraNetwork } from '../../../../util/networks/customNetworks';
import { ChainId, toHex } from '@metamask/controller-utils';

export function getNetworkControllerInstanceOptions(): WalletOptions['instanceOptions']['networkController'] {
  return {
    infuraProjectId: INFURA_PROJECT_ID as string,
    failoverUrls: {
      [ChainId.mainnet]: getFailoverUrlsForInfuraNetwork('ethereum-mainnet'),
      [ChainId['linea-mainnet']]:
        getFailoverUrlsForInfuraNetwork('linea-mainnet'),
      [ChainId['arbitrum-mainnet']]:
        getFailoverUrlsForInfuraNetwork('arbitrum-mainnet'),
      [ChainId['avalanche-mainnet']]:
        getFailoverUrlsForInfuraNetwork('avalanche-mainnet'),
      [ChainId['optimism-mainnet']]:
        getFailoverUrlsForInfuraNetwork('optimism-mainnet'),
      [ChainId['polygon-mainnet']]:
        getFailoverUrlsForInfuraNetwork('polygon-mainnet'),
      [ChainId['base-mainnet']]:
        getFailoverUrlsForInfuraNetwork('base-mainnet'),
      [ChainId['bsc-mainnet']]: getFailoverUrlsForInfuraNetwork('bsc-mainnet'),
      [ChainId['sei-mainnet']]: getFailoverUrlsForInfuraNetwork('sei-mainnet'),
      [ChainId['monad-mainnet']]:
        getFailoverUrlsForInfuraNetwork('monad-mainnet'),
      // HyperEVM and Arc are not part of the `ChainId` enum.
      [toHex(999)]: getFailoverUrlsForInfuraNetwork('hyperevm-mainnet'),
      [toHex(5042)]: getFailoverUrlsForInfuraNetwork('arc-mainnet'),
    },
  };
}
