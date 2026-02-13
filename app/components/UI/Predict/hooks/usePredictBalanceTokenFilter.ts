import { useCallback } from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';
import {
  PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
  PREDICT_BALANCE_CHAIN_ID,
} from '../constants/transactions';
import { PREDICT_BALANCE_TOKEN } from './usePredictPaymentToken';

/**
 * Returns a filter that prepends a synthetic "Predict Balance" token to the
 * token list. The token shows the user's Polymarket balance.
 */
export function usePredictBalanceTokenFilter(options: {
  predictBalance: number;
  isPredictBalanceSelected: boolean;
}): (tokens: AssetType[]) => AssetType[] {
  const { predictBalance, isPredictBalanceSelected } = options;

  const filterTokens = useCallback(
    (tokens: AssetType[]): AssetType[] => {
      const predictBalanceToken: AssetType = {
        address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
        chainId: PREDICT_BALANCE_CHAIN_ID,
        tokenId: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
        name: PREDICT_BALANCE_TOKEN.name,
        symbol: PREDICT_BALANCE_TOKEN.symbol,
        balance: String(predictBalance),
        balanceInSelectedCurrency: `$${predictBalance.toFixed(2)}`,
        image: '',
        logo: '',
        decimals: 2,
        isETH: false,
        isNative: false,
        isSelected: isPredictBalanceSelected,
      };

      const mappedTokens = tokens
        .filter((token) => {
          const bal = parseFloat(token.balance ?? '0');
          return bal > 0;
        })
        .map((token) => ({
          ...token,
          isSelected:
            token.isSelected && isPredictBalanceSelected
              ? false
              : token.isSelected,
        }));

      return [predictBalanceToken, ...mappedTokens];
    },
    [predictBalance, isPredictBalanceSelected],
  );

  return filterTokens;
}
