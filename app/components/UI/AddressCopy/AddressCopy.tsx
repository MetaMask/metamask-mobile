// Third parties dependencies
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useStyles } from '../../../component-library/hooks';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import Routes from '../../../constants/navigation/Routes';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';

// Internal dependencies
import styleSheet from './AddressCopy.styles';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { getFormattedAddressFromInternalAccount } from '../../../core/Multichain/utils';

interface AddressCopyProps {
  account: InternalAccount;
  iconColor?: IconColor;
  hitSlop?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

const AddressCopy = ({ account, iconColor, hitSlop }: AddressCopyProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();

  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

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

  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(
      getFormattedAddressFromInternalAccount(account),
    );
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

  const navigateToAddressList = () => {
    navigate(Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST, {
      groupId: selectedAccountGroupId,
      title: `${strings('multichain_accounts.address_list.receiving_address')}`,
    });
  };

  const handleOnPress = () => {
    if (isMultichainAccountsState2Enabled) {
      navigateToAddressList();
    } else {
      copyAccountToClipboard();
    }
  };

  return (
    <View style={styles.address}>
      <ButtonIcon
        iconName={IconName.Copy}
        size={ButtonIconSize.Lg}
        iconProps={iconColor && { color: iconColor }}
        onPress={handleOnPress}
        testID={WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON}
        hitSlop={hitSlop}
      />
    </View>
  );
};
export default AddressCopy;
