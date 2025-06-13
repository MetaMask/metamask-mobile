import { HistoricLendingMarketApys } from '@metamask/stake-sdk';
import { useState, useCallback, useEffect } from 'react';
import Engine from '../../../../core/Engine';
import { hexToDecimal } from '../../../../util/conversions';
import { EarnTokenDetails } from '../types/lending.types';

const useLendingMarketApys = ({
  asset,
  days = 365,
}: {
  asset: EarnTokenDetails;
  days?: number;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [netSupplyRate, setNetSupplyRate] = useState<
    HistoricLendingMarketApys['netSupplyRate'] | null
  >(null);
  const [totalSupplyRate, setTotalSupplyRate] = useState<
    HistoricLendingMarketApys['totalSupplyRate'] | null
  >(null);
  const [marketApys, setMarketApys] = useState<
    HistoricLendingMarketApys['historicalRates'] | null
  >(null);

  const [marketApyAverages, setMarketApyAverages] = useState<
    HistoricLendingMarketApys['averageRates'] | null
  >(null);

  const fetchMarketApys = useCallback(async () => {
    try {
      const chainId = asset?.chainId;
      const protocol = asset?.experience?.market?.protocol;
      const marketId = asset?.experience?.market?.id;

      if (!chainId || !protocol || !marketId) {
        setError(
          'Failed to fetch lending market apys: chainId, protocol, and/or marketId are undefined',
        );
        return;
      }

      setIsLoading(true);

      const fetchedMarketApys =
        await Engine.context.EarnController.getLendingMarketDailyApysAndAverages(
          {
            protocol,
            marketId,
            chainId: parseInt(hexToDecimal(chainId).toString()),
            days,
          },
        );

      setMarketApys(fetchedMarketApys?.historicalRates ?? null);
      setMarketApyAverages(fetchedMarketApys?.averageRates ?? null);
      setNetSupplyRate(fetchedMarketApys?.netSupplyRate ?? null);
      setTotalSupplyRate(fetchedMarketApys?.totalSupplyRate ?? null);
    } catch (e) {
      setError('Failed to fetch lending market apys');
    } finally {
      setIsLoading(false);
    }
  }, [
    asset?.chainId,
    asset?.experience?.market?.id,
    asset?.experience?.market?.protocol,
    days,
  ]);

  useEffect(() => {
    fetchMarketApys();
  }, [fetchMarketApys]);

  return {
    isLoading,
    error,
    netSupplyRate,
    totalSupplyRate,
    marketApys,
    marketApyAverages,
    fetchMarketApys,
  };
};

export default useLendingMarketApys;
