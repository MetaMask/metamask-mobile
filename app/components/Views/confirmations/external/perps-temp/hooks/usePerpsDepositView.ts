import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useAutomaticTransactionPayToken } from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { usePerpsDepositInit } from './usePerpsDepositInit';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayTokenAmounts } from '../../../hooks/pay/useTransactionPayTokenAmounts';
import {
  ARBITRUM_USDC_ADDRESS,
  PERPS_MINIMUM_DEPOSIT,
} from '../../../constants/perps';
import { usePerpsMeasurement } from '../../../../../UI/Perps/hooks';
import { PerpsMeasurementName } from '../../../../../UI/Perps/constants/performanceMetrics';

export function usePerpsDepositView({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  usePerpsDepositInit();

  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { payToken } = useTransactionPayToken();
  const { amounts: sourceAmounts } = useTransactionPayTokenAmounts();

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const isFullView =
    !isKeyboardVisible &&
    (isQuotesLoading || Boolean(quotes?.length) || sourceAmounts?.length === 0);

  // Track quote received performance
  usePerpsMeasurement({
    measurementName: PerpsMeasurementName.QUOTE_RECEIVED,
    conditions: [!!(quotes && quotes.length > 0), !isQuotesLoading],
  });

  // Track source token list loaded performance
  usePerpsMeasurement({
    measurementName: PerpsMeasurementName.FUNDING_SOURCE_TOKEN_LIST_LOADED,
    conditions: [!!(sourceAmounts && sourceAmounts.length > 0)],
  });

  useAutomaticTransactionPayToken({
    balanceOverrides: [
      {
        address: ARBITRUM_USDC_ADDRESS,
        balance: PERPS_MINIMUM_DEPOSIT,
        chainId: CHAIN_IDS.ARBITRUM,
      },
    ],
  });

  return {
    isFullView,
    isPayTokenSelected: Boolean(payToken),
  };
}
