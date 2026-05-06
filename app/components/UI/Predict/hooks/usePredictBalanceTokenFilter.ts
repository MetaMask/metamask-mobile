import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import useFiatFormatter from '../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { POLYGON_PUSD } from '../../../Views/confirmations/constants/predict';
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

export function usePredictBalanceTokenFilter(
  forceEnabled = false,
  onSelect?: () => void,
): (tokens: AssetType[]) => TokenListItem[] {
  const navigation = useNavigation();
  const transactionMeta = useTransactionMetadataRequest();
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const pusdToken = useSelector((state: RootState) =>
    selectSingleTokenByAddressAndChainId(
      state,
      POLYGON_PUSD.address,
      PREDICT_BALANCE_CHAIN_ID,
    ),
  );

  const handleAddFunds = useCallback(() => {
    navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      params: { autoDeposit: true },
    });
  }, [navigation]);

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
        icon: pusdToken?.image ?? '',
        name: strings('predict.payment.predict_balance'),
        name_description: POLYGON_PUSD.symbol,
        fiat: balanceFormatted,
        isSelected: isPredictBalanceSelected,
        action: onSelect ?? (() => undefined),
        actions: [
          {
            buttonLabel: strings('predict.payment.add'),
            onPress: handleAddFunds,
          },
        ],
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
      pusdToken,
      handleAddFunds,
      onSelect,
    ],
  );
}
