import images from 'images/image-icons';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectProviderConfig,
  selectTicker,
} from '../../../../selectors/networkController';
import Networks, {
  getTestNetImageByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet,
} from '../../../../util/networks';

const useNetworkInfo = () => {
  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);

  const networkName = useMemo(
    () =>
      providerConfig?.nickname ??
      Networks[providerConfig?.type]?.name ??
      Networks.rpc.name,
    [providerConfig],
  );

  const networkBadgeSource = useMemo(() => {
    if (!chainId) return undefined;

    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
    if (isMainnetByChainId(chainId)) return images.ETHEREUM;
    if (isLineaMainnetByChainId(chainId)) return images['LINEA-MAINNET'];

    return images[ticker];
  }, [chainId, ticker]);

  return { networkName, networkBadgeSource };
};

export default useNetworkInfo;
