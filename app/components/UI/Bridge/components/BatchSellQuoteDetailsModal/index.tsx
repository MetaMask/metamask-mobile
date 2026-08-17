import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
  ButtonIconSize,
} from '@metamask/design-system-react-native';

import Routes from '../../../../../constants/navigation/Routes';
import {
  selectBatchSellSlippages,
  selectBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  BatchSellQuotesFromReduxProvider,
  useBatchSellQuotesContext,
} from '../../hooks/useBatchSellQuotes/BatchSellQuotesProvider';
import { getBatchSellQuoteDetailsRows } from './getBatchSellQuoteRowDisplay';
import { BatchSellQuoteDetails } from './BatchSellQuoteDetails';
import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import { strings } from '../../../../../../locales/i18n';

function BatchSellQuoteDetailsModalContent() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const slippages = useSelector(selectBatchSellSlippages);
  const currency = useSelector(selectCurrentCurrency);
  const batchSellQuotes = useBatchSellQuotesContext();
  const tokenData = useMemo(
    () =>
      getBatchSellQuoteDetailsRows({
        sourceTokens,
        quotes: batchSellQuotes,
        slippages,
        currency,
      }),
    [batchSellQuotes, currency, slippages, sourceTokens],
  );
  const handleOpenMinimumReceivedInfo = () => {
    navigation.replace(
      Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_QUOTE_DETAILS_MODAL,
        },
      },
    );
  };

  return (
    <BottomSheet
      testID={BatchSellQuoteDetailsModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
    >
      <BottomSheetHeader
        onClose={navigation.goBack}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: BatchSellQuoteDetailsModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.batch_sell_total_received')}
      </BottomSheetHeader>
      <BatchSellQuoteDetails
        tokenData={tokenData}
        totalReceived={batchSellQuotes.totalReceived}
        minimumReceived={batchSellQuotes.minimumReceived}
        isLoading={batchSellQuotes.isSummaryLoading}
        onMinimumReceivedInfoPress={handleOpenMinimumReceivedInfo}
      />
    </BottomSheet>
  );
}

export function BatchSellQuoteDetailsModal() {
  return (
    <BatchSellQuotesFromReduxProvider shouldUpdateBatchSellTrades={false}>
      <BatchSellQuoteDetailsModalContent />
    </BatchSellQuotesFromReduxProvider>
  );
}

export {
  BatchSellQuoteDetails,
  TotalReceivedSummaryRow,
} from './BatchSellQuoteDetails';
