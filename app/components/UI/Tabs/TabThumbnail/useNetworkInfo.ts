import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectProviderConfig,
  selectNetworkName,
} from '../../../../selectors/networkController';
import {
  getNetworkImageSource,
  getNetworkNameFromProviderConfig,
} from '../../../../util/networks';

import { ProviderConfig } from '@metamask/network-controller';

const useNetworkInfo = (): object => {
  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);

  const networkName = useSelector(selectNetworkName);

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        networkType: providerConfig.type,
        chainId: providerConfig.chainId,
      }),
    [providerConfig],
  );

  return networkImageSource;
};

export default useNetworkInfo;
