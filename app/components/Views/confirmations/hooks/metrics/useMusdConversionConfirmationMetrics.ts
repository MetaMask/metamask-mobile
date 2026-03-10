import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from '../../../../../util/navigation/navUtils';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  useTransactionPayIsMaxAmount,
  useTransactionPayQuotes,
} from '../pay/useTransactionPayData';
import { getMusdConversionQuoteTrackingData } from '../../../../UI/Earn/utils/analytics';
import { ConfirmationParams } from '../../components/confirm/confirm-component';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

/**
 * Enriches mUSD conversion confirmation metrics with quote tracking data.
 *
 * Dispatches {@link updateConfirmationMetric} to attach confirmation source,
 * max-amount flag, and quote-level properties (selected quote, exchange rate, etc.)
 * to the transaction's confirmation metric entry. Re-dispatches whenever the
 * underlying transaction metadata, quotes, or max-amount state change.
 */
export function useMusdConversionConfirmationMetrics() {
  const dispatch = useDispatch();
  const { forceBottomSheet } = useParams<ConfirmationParams>();
  const txMeta = useTransactionMetadataRequest();
  const quotes = useTransactionPayQuotes();
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const transactionId = txMeta?.id ?? '';

  const confirmationSource = forceBottomSheet
    ? EVENT_LOCATIONS.QUICK_CONVERT_MAX_BOTTOM_SHEET_CONFIRMATION_SCREEN
    : EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN;

  const quoteTrackingData = useMemo(() => {
    if (!txMeta || !quotes?.length) {
      return {};
    }
    return getMusdConversionQuoteTrackingData(txMeta, quotes);
  }, [txMeta, quotes]);

  useEffect(() => {
    dispatch(
      updateConfirmationMetric({
        id: transactionId,
        params: {
          properties: {
            confirmation_source: confirmationSource,
            is_max: isMaxAmount,
            ...quoteTrackingData,
          },
          sensitiveProperties: {},
        },
      }),
    );
  }, [
    dispatch,
    transactionId,
    confirmationSource,
    isMaxAmount,
    quoteTrackingData,
  ]);
}
