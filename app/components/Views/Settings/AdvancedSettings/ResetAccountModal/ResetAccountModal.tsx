import React, { useCallback, useRef } from 'react';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { wipeTransactions } from '../../../../../util/transaction-controller';
import { wipeSmartTransactions } from '../../../../../util/smart-transactions';
import { wipeBridgeStatus } from '../../../../UI/Bridge/utils';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectChainId } from '../../../../../selectors/networkController';
import { usePerpsFirstTimeUser } from '../../../../UI/Perps/hooks/usePerpsFirstTimeUser';
import { AdvancedViewSelectorsIDs } from '../AdvancedView.testIds';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
} from '@metamask/design-system-react-native';

export const ResetAccountModal = ({
  resetModalVisible,
  cancelResetAccount,
  styles,
}: {
  resetModalVisible: boolean;
  cancelResetAccount: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const chainId = useSelector(selectChainId);
  const { resetFirstTimeUserState, clearPendingTransactionRequests } =
    usePerpsFirstTimeUser();

  const resetAccount = useCallback(() => {
    if (selectedAddress) {
      wipeBridgeStatus(selectedAddress, chainId);
      wipeSmartTransactions(selectedAddress);
    }
    wipeTransactions();
    // Reset Perps first-time user state for testing
    resetFirstTimeUserState();
    // Clear any stuck pending Perps transactions
    clearPendingTransactionRequests();
    navigation.navigate('WalletView');
  }, [
    chainId,
    clearPendingTransactionRequests,
    navigation,
    resetFirstTimeUserState,
    selectedAddress,
  ]);

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      resetAccount();
    });
  }, [resetAccount]);

  if (!resetModalVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={cancelResetAccount}
      keyboardAvoidingViewEnabled
    >
      <BottomSheetHeader onClose={handleRequestClose}>
        <Text style={styles.modalTitle} variant={TextVariant.HeadingMD}>
          {strings('app_settings.reset_account_modal_title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="px-4 pt-2 pb-6">
        <Text style={styles.modalText}>
          {strings('app_settings.reset_account_modal_message')}
        </Text>
      </Box>
      <BottomSheetFooter
        secondaryButtonProps={{
          children: strings('app_settings.reset_account_cancel_button'),
          onPress: handleRequestClose,
        }}
        primaryButtonProps={{
          children: strings('app_settings.reset_account_confirm_button'),
          onPress: handleConfirm,
          isDanger: true,
          testID: AdvancedViewSelectorsIDs.RESET_ACCOUNT_CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};
