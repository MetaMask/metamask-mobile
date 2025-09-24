import { useEffect, useRef } from 'react';
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
import { usePerpsPerformance } from '../../../../../UI/Perps/hooks/usePerpsPerformance';
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
  const { startMeasure, endMeasure } = usePerpsPerformance();
  const hasStartedMeasurement = useRef(false);

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const isFullView =
    !isKeyboardVisible &&
    (isQuotesLoading || Boolean(quotes?.length) || sourceAmounts?.length === 0);

  // Track quote loading start
  useEffect(() => {
    if (isQuotesLoading && !hasStartedMeasurement.current) {
      startMeasure(PerpsMeasurementName.QUOTE_RECEIVED);
      hasStartedMeasurement.current = true;
    }
  }, [isQuotesLoading, startMeasure]);

  // Track quote received performance when quotes are available
  useEffect(() => {
    if (
      quotes &&
      quotes.length > 0 &&
      !isQuotesLoading &&
      hasStartedMeasurement.current
    ) {
      endMeasure(PerpsMeasurementName.QUOTE_RECEIVED);
      // Reset the flag
      hasStartedMeasurement.current = false;
    }
  }, [quotes, isQuotesLoading, endMeasure]);

  // Track source token list loading performance
  const hasStartedTokenListMeasurement = useRef(false);
  useEffect(() => {
    // Start measurement when component mounts (token list loading begins)
    if (!hasStartedTokenListMeasurement.current) {
      startMeasure(PerpsMeasurementName.FUNDING_SOURCE_TOKEN_LIST_LOADED);
      hasStartedTokenListMeasurement.current = true;
    }
  }, [startMeasure]);

  useEffect(() => {
    // End measurement when source amounts are available (token list loaded)
    if (
      sourceAmounts &&
      sourceAmounts.length > 0 &&
      hasStartedTokenListMeasurement.current
    ) {
      endMeasure(PerpsMeasurementName.FUNDING_SOURCE_TOKEN_LIST_LOADED);
      hasStartedTokenListMeasurement.current = false;
    }
  }, [sourceAmounts, endMeasure]);

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
