import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
  ButtonIconSize,
} from '@metamask/design-system-react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { selectBatchSellSourceTokens } from '../../../../../core/redux/slices/bridge';
import {
  getBatchSellOrderedQuoteTokenData,
  useBatchSellQuoteData,
} from '../../hooks/useBatchSellQuoteData';
import { BatchSellQuoteDetails } from './BatchSellQuoteDetails';
import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

export function BatchSellQuoteDetailsModal() {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const surfaceClass = useElevatedSurface();
  const batchSellQuoteData = useBatchSellQuoteData({
    shouldUpdateBatchSellTrades: false,
  });
  const tokenData = useMemo(
    () =>
      getBatchSellOrderedQuoteTokenData(
        sourceTokens,
        batchSellQuoteData.tokenData,
      ),
    [batchSellQuoteData.tokenData, sourceTokens],
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
      twClassName={surfaceClass}
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
        totalReceived={batchSellQuoteData.totalReceived}
        minimumReceived={batchSellQuoteData.minimumReceived}
        isLoading={batchSellQuoteData.isSummaryLoading}
        onMinimumReceivedInfoPress={handleOpenMinimumReceivedInfo}
      />
    </BottomSheet>
  );
}

export {
  BatchSellQuoteDetails,
  TotalReceivedSummaryRow,
} from './BatchSellQuoteDetails';
