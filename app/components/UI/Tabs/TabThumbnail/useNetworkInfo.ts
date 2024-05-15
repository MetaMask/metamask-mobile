import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../../selectors/networkController';
import {
  getNetworkImageSource,
  getNetworkNameFromProviderConfig,
} from '../../../../util/networks';

import { ProviderConfig } from '@metamask/network-controller';
import { FooterNetworkInfo } from './TabThumbnail.types';

const useNetworkInfo = (): FooterNetworkInfo => {
  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);

  const networkName = useMemo(
    () => getNetworkNameFromProviderConfig(providerConfig),
    [providerConfig],
  );

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        networkType: providerConfig.type,
        chainId: providerConfig.chainId,
      }),
    [providerConfig],
  );

  return { networkName, networkImageSource };
};

export default useNetworkInfo;
