import React, { useCallback, useRef, useMemo } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import TransactionDetails from '../TransactionDetails';
import { toDateFormat } from '../../../../util/date';
import { makeSelectTransactionMetadataById } from '../../../../selectors/transactionController';

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
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);

  const { tx, transactionElement, transactionDetails } = route.params;

  const selectLiveTransaction = useMemo(
    () => makeSelectTransactionMetadataById(tx.id),
    [tx.id],
  );
  const liveTransaction = useSelector(selectLiveTransaction);
  const currentTx = useMemo(
    () =>
      liveTransaction
        ? { ...liveTransaction, txParams: { ...liveTransaction.txParams } }
        : tx,
    [liveTransaction, tx],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSpeedUp = useCallback(() => {
    route.params.showSpeedUpModal();
  }, [route.params]);

  const handleCancel = useCallback(() => {
    route.params.showCancelModal();
  }, [route.params]);

  return (
    <BottomSheet ref={sheetRef} goBack={handleGoBack}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMd}>
          {transactionElement?.actionKey}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {currentTx?.time ? toDateFormat(currentTx.time) : null}
        </Text>
      </BottomSheetHeader>

      <TransactionDetails
        transactionObject={currentTx}
        transactionDetails={transactionDetails}
        showSpeedUpModal={handleSpeedUp}
        showCancelModal={handleCancel}
        close={handleClose}
      />
    </BottomSheet>
  );
};

export default TransactionDetailsSheet;
