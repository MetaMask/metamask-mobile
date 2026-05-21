import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  ButtonIconSize,
} from '@metamask/design-system-react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { BatchSellQuoteDetails } from './BatchSellQuoteDetails';
import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import { BatchSellQuoteDetailsModalParams } from './BatchSellQuoteDetailsModal.types';
import { strings } from '../../../../../../locales/i18n';

export function BatchSellQuoteDetailsModal() {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const quoteDetailsParams = useParams<BatchSellQuoteDetailsModalParams>();
  const { tokenData, totalReceived, minimumReceived, isLoading } =
    quoteDetailsParams;
  const handleOpenMinimumReceivedInfo = () => {
    navigation.replace(
      Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_QUOTE_DETAILS_MODAL,
          params: quoteDetailsParams,
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
        totalReceived={totalReceived}
        minimumReceived={minimumReceived}
        isLoading={isLoading}
        onMinimumReceivedInfoPress={handleOpenMinimumReceivedInfo}
      />
    </BottomSheet>
  );
}

export { BatchSellQuoteDetails };
