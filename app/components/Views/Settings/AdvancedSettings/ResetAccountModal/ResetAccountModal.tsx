import React, { useRef } from 'react';
import { View } from 'react-native';
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
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
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
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const chainId = useSelector(selectChainId);
  const { resetFirstTimeUserState, clearPendingTransactionRequests } =
    usePerpsFirstTimeUser();

  const resetAccount = () => {
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
  };

  const closeSheet = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const confirmResetAccount = () => {
    resetAccount();
    sheetRef.current?.onCloseBottomSheet();
  };

  return resetModalVisible ? (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={cancelResetAccount}
    >
      <View style={styles.destructiveSheetContent}>
        <Icon
          style={styles.destructiveSheetIcon}
          size={IconSize.Xl}
          color={IconColor.ErrorDefault}
          name={IconName.Danger}
        />
        <Text
          variant={TextVariant.HeadingMd}
          color={TextColor.TextDefault}
          style={styles.destructiveSheetTitle}
        >
          {strings('app_settings.reset_account_modal_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          style={styles.destructiveSheetText}
        >
          {strings('app_settings.reset_account_modal_message')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDanger
          testID={AdvancedViewSelectorsIDs.RESET_ACCOUNT_CONFIRM_BUTTON}
          onPress={confirmResetAccount}
        >
          {strings('app_settings.reset_account_confirm_button')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={closeSheet}
        >
          {strings('app_settings.reset_account_cancel_button')}
        </Button>
      </View>
    </BottomSheet>
  ) : null;
};
