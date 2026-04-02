import { BigNumber } from 'bignumber.js';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { getNetworkImageSource } from '../../../../util/networks';
import useFiatFormatter from '../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { POLYGON_USDCE } from '../../../Views/confirmations/constants/predict';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { AssetType } from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import {
  PREDICT_BALANCE_CHAIN_ID,
  PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
} from '../constants/transactions';
import { usePredictBalance } from './usePredictBalance';
import { usePredictPaymentToken } from './usePredictPaymentToken';

export function usePredictBalanceTokenFilter(
  forceEnabled = false,
): (tokens: AssetType[]) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const usdceToken = useSelector((state: RootState) =>
    selectSingleTokenByAddressAndChainId(
      state,
      POLYGON_USDCE.address,
      PREDICT_BALANCE_CHAIN_ID,
    ),
  );

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (
        !forceEnabled &&
        !hasTransactionType(transactionMeta, [
          TransactionType.predictDepositAndOrder,
        ])
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
        image: usdceToken?.image ?? '',
        logo: usdceToken?.image ?? '',
        networkBadgeSource: getNetworkImageSource({
          chainId: PREDICT_BALANCE_CHAIN_ID,
        }),
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
    [
      forceEnabled,
      transactionMeta,
      isPredictBalanceSelected,
      predictBalance,
      formatFiat,
      usdceToken,
    ],
  );
}
