import { BigNumber } from 'bignumber.js';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import useFiatFormatter from '../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { POLYGON_USDCE } from '../../../Views/confirmations/constants/predict';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  AssetType,
  HighlightedItem,
  TokenListItem,
} from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { PREDICT_BALANCE_CHAIN_ID } from '../constants/transactions';
import { usePredictBalance } from './usePredictBalance';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { strings } from '../../../../../locales/i18n';

export function usePredictBalanceTokenFilter(
  forceEnabled = false,
  onAddFunds?: () => void,
  onSelect?: () => void,
): (tokens: AssetType[]) => TokenListItem[] {
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
    (tokens: AssetType[]): TokenListItem[] => {
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

      const predictBalanceHighlightedItem: HighlightedItem = {
        position: 'in_asset_list',
        icon: usdceToken?.image ?? '',
        name: strings('predict.payment.predict_balance'),
        name_description: POLYGON_USDCE.symbol,
        fiat: balanceFormatted,
        isSelected: isPredictBalanceSelected,
        action: onSelect ?? (() => undefined),
        actions: onAddFunds
          ? [
              {
                buttonLabel: strings('predict.payment.add'),
                onPress: onAddFunds,
              },
            ]
          : undefined,
      };

      const mappedTokens = tokens.map((token) => ({
        ...token,
        isSelected:
          token.isSelected && isPredictBalanceSelected
            ? false
            : token.isSelected,
      }));

      return [predictBalanceHighlightedItem, ...mappedTokens];
    },
    [
      forceEnabled,
      transactionMeta,
      isPredictBalanceSelected,
      predictBalance,
      formatFiat,
      usdceToken,
      onAddFunds,
      onSelect,
    ],
  );
}
