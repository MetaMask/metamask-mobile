import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../util/networks';

import { ProviderConfig } from '@metamask/network-controller';

const useNetworkInfo = (): object => {
  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);

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
