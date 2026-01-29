import React, { useCallback, useRef } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { TextColor } from '../../../../component-library/components/Texts/Text/Text.types';

import TransactionDetails from '../TransactionDetails';
import { toDateFormat } from '../../../../util/date';

interface TransactionDetailsSheetParams {
  tx: {
    id: string;
    time: number;
    txParams?: {
      nonce?: string;
    };
    chainId: string;
    status: string;
    [key: string]: unknown;
  };
  transactionElement: {
    actionKey: string;
    [key: string]: unknown;
  };
  transactionDetails: {
    hash?: string;
    renderFrom?: string;
    renderTo?: string;
    summaryAmount?: string;
    summaryFee?: string;
    summaryTotalAmount?: string;
    summarySecondaryTotalAmount?: string;
    transactionType?: string;
    txChainId?: string;
    [key: string]: unknown;
  };
  showSpeedUpModal: () => void;
  showCancelModal: () => void;
}

type TransactionDetailsSheetRouteProp = RouteProp<
  { params: TransactionDetailsSheetParams },
  'params'
>;

const TransactionDetailsSheet: React.FC = () => {
  const route = useRoute<TransactionDetailsSheetRouteProp>();
  const sheetRef = useRef<BottomSheetRef>(null);

  const { tx, transactionElement, transactionDetails } = route.params;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  // Note: TransactionDetails internally calls close() before invoking these,
  // so we don't need to close the sheet here - it's already handled
  const handleSpeedUp = useCallback(() => {
    route.params.showSpeedUpModal();
  }, [route.params]);

  const handleCancel = useCallback(() => {
    route.params.showCancelModal();
  }, [route.params]);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {transactionElement?.actionKey}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {tx?.time ? toDateFormat(tx.time) : null}
        </Text>
      </BottomSheetHeader>

      <TransactionDetails
        transactionObject={tx}
        transactionDetails={transactionDetails}
        showSpeedUpModal={handleSpeedUp}
        showCancelModal={handleCancel}
        close={handleClose}
      />
    </BottomSheet>
  );
};

export default TransactionDetailsSheet;
