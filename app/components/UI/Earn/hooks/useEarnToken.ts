import { Token } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { selectTokenDisplayData } from '../../../../selectors/tokenSearchDiscoveryDataController';
import { TokenI } from '../../Tokens/types';
import { EarnTokenDetails } from '../types/lending.types';
import { getEstimatedAnnualRewards } from '../utils/token';
import { fetchTokenSnapshot } from '../utils/token-snapshot';

/**
 * Represents the price of a token in a currency. Picked from @metamask/assets-controllers
 * TODO: Can this be exported from @metamask/assets-controllers?
 */
export interface TokenPrice<TokenAddress extends Hex, Currency extends string> {
  tokenAddress: TokenAddress;
  currency: Currency;
  allTimeHigh: number;
  allTimeLow: number;
  circulatingSupply: number;
  dilutedMarketCap: number;
  high1d: number;
  low1d: number;
  marketCap: number;
  marketCapPercentChange1d: number;
  price: number;
  priceChange1d: number;
  pricePercentChange1d: number;
  pricePercentChange1h: number;
  pricePercentChange1y: number;
  pricePercentChange7d: number;
  pricePercentChange14d: number;
  pricePercentChange30d: number;
  pricePercentChange200d: number;
  totalVolume: number;
}
export interface TokenSnapshot {
  found: true;
  chainId: Hex;
  address: string;
  currency: string;
  token: Token;
  price: TokenPrice<Hex, string> | null;
}

const useEarnToken = (asset: TokenI | EarnTokenDetails) => {
  const [tokenSnapshot, setTokenSnapshot] = useState<TokenSnapshot | undefined>(
    undefined,
  );
  const [isLoadingTokenSnapshot, setIsLoadingTokenSnapshot] = useState(false);
  const [errorTokenSnapshot, setErrorTokenSnapshot] = useState<Error | null>(
    null,
  );

  const [tokenDisplayDataParams, setTokenDisplayDataParams] = useState<{
    chainId: Hex;
    address: Hex;
  } | null>(null);

  const tokenDisplayData = useSelector((state: RootState) =>
    tokenDisplayDataParams
      ? selectTokenDisplayData(
          state,
          tokenDisplayDataParams.chainId,
          tokenDisplayDataParams.address,
        )
      : undefined,
  );

  const currentCurrency = useSelector(selectCurrentCurrency);
  const earnToken = useSelector((state: RootState) =>
    earnSelectors.selectEarnToken(state, asset),
  );
  const outputToken = useSelector((state: RootState) =>
    earnSelectors.selectEarnOutputToken(state, asset),
  );
  const earnTokenPair = useSelector((state: RootState) =>
    earnSelectors.selectEarnTokenPair(state, asset),
  );

  const getEstimatedAnnualRewardsForAmount = (
    earnTokenDetails: EarnTokenDetails,
    amountTokenMinimalUnit: string,
    amountFiatNumber: number,
  ) =>
    getEstimatedAnnualRewards(
      earnTokenDetails.experience.apr,
      amountFiatNumber,
      amountTokenMinimalUnit,
      currentCurrency,
      earnTokenDetails.decimals,
      earnTokenDetails?.ticker || earnTokenDetails.symbol,
    );

  const getTokenSnapshot = useCallback(async (chainId: Hex, address: Hex) => {
    try {
      setIsLoadingTokenSnapshot(true);
      await fetchTokenSnapshot(chainId, address);
      setIsLoadingTokenSnapshot(false);
      setTokenDisplayDataParams({ chainId, address });
    } catch (error) {
      console.error(error);
      setErrorTokenSnapshot(error as Error);
      setIsLoadingTokenSnapshot(false);
    }
  }, []);

  useEffect(() => {
    if (tokenDisplayData?.found) {
      setTokenSnapshot(tokenDisplayData);
    }
  }, [tokenDisplayData]);

  return {
    isReceiptToken: !!outputToken,
    isEarnToken: !!earnToken,
    earnToken,
    outputToken,
    earnTokenPair,
    tokenSnapshot,
    isLoadingTokenSnapshot,
    errorTokenSnapshot,
    getEstimatedAnnualRewardsForAmount,
    getTokenSnapshot,
  };
};

export default useEarnToken;
