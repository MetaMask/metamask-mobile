import { useState } from 'react';
import Engine from '../../../../core/Engine';
import { selectLendingMarketsForChainId } from '@metamask-previews/earn-controller';
import { useEarnSelector } from './useEarnSelector';

const useMarketMetadata = (chainId: number) => {
  const markets = useEarnSelector(selectLendingMarketsForChainId(chainId));
  const getMarketsForChain = selectLendingMarketsForChainId(
    Engine.context.EarnController.state,
  );
  const marketMetadata = getMarketsForChain(chainId);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketMetadata = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingMarketMetadata(
        chainId,
      );
    } catch (err) {
      setError('Failed to fetch market metadata');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    marketMetadata,
    isLoading,
    error,
    refreshMarketMetadata: fetchMarketMetadata,
  };
};

export default useMarketMetadata;
