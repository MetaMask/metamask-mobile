import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../../selectors/networkController';
import {
  getNetworkImageSource,
  getNetworkNameFromProviderConfig,
} from '../../../../util/networks';

const useNetworkInfo = () => {
  const providerConfig = useSelector(selectProviderConfig);

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
