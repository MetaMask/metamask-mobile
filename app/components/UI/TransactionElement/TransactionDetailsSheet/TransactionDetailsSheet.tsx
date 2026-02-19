import React, { useCallback, useRef } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';

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
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import { RootState } from '../../../../reducers';

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

  const liveTransaction = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, tx.id),
  );
  const currentTx = liveTransaction ?? tx;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {transactionElement?.actionKey}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {currentTx?.time ? toDateFormat(currentTx.time) : null}
        </Text>
      </BottomSheetHeader>

      <TransactionDetails
        transactionObject={currentTx}
        transactionDetails={transactionDetails}
        close={handleClose}
      />
    </BottomSheet>
  );
};

export default TransactionDetailsSheet;
