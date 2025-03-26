// Third parties dependencies
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

// External dependencies
import { TouchableOpacity } from 'react-native-gesture-handler';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';
import { strings } from '../../../../locales/i18n';
import { View } from 'react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useStyles } from '../../../component-library/hooks';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

// Internal dependencies
import styleSheet from './AddressCopy.styles';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { getFormattedAddressFromInternalAccount } from '../../../core/Multichain/utils';

const AddressCopy = () => {
  const { styles } = useStyles(styleSheet, {});

  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();

  const handleShowAlert = (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config));

  const handleProtectWalletModalVisible = () =>
    dispatch(protectWalletModalVisible());

  /**
   * A string that represents the selected address
   */
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const copyAccountToClipboard = async () => {
    if (selectedInternalAccount?.address) {
      await ClipboardManager.setString(
        getFormattedAddressFromInternalAccount(selectedInternalAccount),
      );
    }
    handleShowAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
    setTimeout(() => handleProtectWalletModalVisible(), 2000);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_COPIED_ADDRESS).build(),
    );
  };
  return (
    <View style={styles.address}>
      <TouchableOpacity
        style={styles.copyButton}
        onPress={copyAccountToClipboard}
        testID={WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON}
      >
        <Icon
          name={IconName.Copy}
          size={IconSize.Lg}
          color={IconColor.Default}
        />
      </TouchableOpacity>
    </View>
  );
};
export default AddressCopy;
