import { BigNumber } from 'bignumber.js';
import { useCallback } from 'react';
import useFiatFormatter from '../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { PREDICT_DEPOSIT_AND_ORDER_TYPE } from '../../../Views/confirmations/constants/predict';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { AssetType } from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import {
  PREDICT_BALANCE_CHAIN_ID,
  PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
} from '../constants/transactions';
import { usePredictBalance } from './usePredictBalance';
import { usePredictPaymentToken } from './usePredictPaymentToken';

export function usePredictBalanceTokenFilter(): (
  tokens: AssetType[],
) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (
        !hasTransactionType(transactionMeta, [PREDICT_DEPOSIT_AND_ORDER_TYPE])
      ) {
        return tokens;
      }

      const balanceStr = String(predictBalance);
      const balanceFormatted = formatFiat(new BigNumber(balanceStr));

      const predictBalanceToken: AssetType = {
        address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
        chainId: PREDICT_BALANCE_CHAIN_ID,
        tokenId: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
        name: 'Predict balance',
        symbol: 'USDC.e',
        balance: balanceStr,
        balanceInSelectedCurrency: balanceFormatted,
        image: '',
        logo: '',
        decimals: 6,
        isETH: false,
        isNative: false,
        isSelected: isPredictBalanceSelected,
      };

      const mappedTokens = tokens.map((token) => ({
        ...token,
        isSelected:
          token.isSelected && isPredictBalanceSelected
            ? false
            : token.isSelected,
      }));

      return [predictBalanceToken, ...mappedTokens];
    },
    [transactionMeta, isPredictBalanceSelected, predictBalance, formatFiat],
  );
}
