import React from 'react';
import { View } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import ActionModal from '../../../../UI/ActionModal';
import { wipeTransactions } from '../../../../../util/transaction-controller';
import { wipeSmartTransactions } from '../../../../../util/smart-transactions';
import { wipeBridgeStatus } from '../../../../UI/Bridge/utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectChainId } from '../../../../../selectors/networkController';
import { usePerpsFirstTimeUser } from '../../../../UI/Perps/hooks/usePerpsFirstTimeUser';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';

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
  const navigation = useNavigation();
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

  return (
    <ActionModal
      modalVisible={resetModalVisible}
      confirmText={strings('app_settings.reset_account_confirm_button')}
      cancelText={strings('app_settings.reset_account_cancel_button')}
      onCancelPress={cancelResetAccount}
      onRequestClose={cancelResetAccount}
      onConfirmPress={resetAccount}
      childrenContainerStyle={styles.modalChildrenContainer}
    >
      <View style={styles.modalContentWrapper}>
        <HeaderCenter
          title={strings('app_settings.reset_account_modal_title')}
          onClose={cancelResetAccount}
        />
        <View style={styles.modalView}>
          <Text style={styles.modalText}>
            {strings('app_settings.reset_account_modal_message')}
          </Text>
        </View>
      </View>
    </ActionModal>
  );
};
