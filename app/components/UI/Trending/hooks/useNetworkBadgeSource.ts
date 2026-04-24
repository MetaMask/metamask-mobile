import { useMemo } from 'react';
import { isCaipChainId } from '@metamask/utils';
import {
  getCaipChainIdFromAssetId,
  getNetworkBadgeSource,
} from '../components/TrendingTokenRowItem/utils';

const useNetworkBadgeSource = (assetId: string) =>
  useMemo(() => {
    const caipChainId = getCaipChainIdFromAssetId(assetId);
    if (!isCaipChainId(caipChainId)) return undefined;
    return getNetworkBadgeSource(caipChainId);
  }, [assetId]);

export default useNetworkBadgeSource;
