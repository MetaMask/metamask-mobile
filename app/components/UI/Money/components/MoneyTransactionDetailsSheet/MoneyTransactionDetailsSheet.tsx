import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useParams } from '../../../../../util/navigation/navUtils';
import { TransactionDetails } from '../../../../Views/confirmations/components/activity/transaction-details/transaction-details';
import { getTitle } from '../../../../Views/confirmations/components/activity/transaction-details/transaction-details';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';

interface MoneyTransactionDetailsSheetParams {
  transactionId: string;
}

/**
 * Renders the transaction details screen as a full-screen bottom sheet modal
 * inside the Money modal stack.  Because this component is the actual
 * navigation screen, all `useRoute()` calls inside `TransactionDetails` and
 * its child hooks transparently pick up `{ transactionId }` from this screen's
 * route params — no additional context providers are needed.
 */
const MoneyTransactionDetailsSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  // Route params are read here only to satisfy TypeScript; the real consumers
  // are the hooks inside TransactionDetails which call useRoute() themselves.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { transactionId } = useParams<MoneyTransactionDetailsSheetParams>();

  // Look up the transaction so we can show the right title in the header.
  const { transactionMeta } = useTransactionDetails();
  const title = transactionMeta ? getTitle(transactionMeta) : '';

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      goBack={handleGoBack}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>{title}</Text>
      </BottomSheetHeader>
      <TransactionDetails />
    </BottomSheet>
  );
};

export default MoneyTransactionDetailsSheet;
