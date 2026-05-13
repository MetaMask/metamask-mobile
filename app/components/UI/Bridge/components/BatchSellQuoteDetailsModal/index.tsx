import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  ButtonIconSize,
} from '@metamask/design-system-react-native';

import { useParams } from '../../../../../util/navigation/navUtils';
import { BatchSellQuoteDetails } from './BatchSellQuoteDetails';
import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import { BatchSellQuoteDetailsModalParams } from './BatchSellQuoteDetailsModal.types';
import { strings } from '../../../../../../locales/i18n';

export function BatchSellQuoteDetailsModal() {
  const navigation = useNavigation();
  const { tokenData, totalReceived, minimumReceived } =
    useParams<BatchSellQuoteDetailsModalParams>();

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
      />
    </BottomSheet>
  );
}

export { BatchSellQuoteDetails };
