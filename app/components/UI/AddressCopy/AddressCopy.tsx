// Third parties dependencies
import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AccountGroupId } from '@metamask/account-api';

// External dependencies
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';

import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useStyles } from '../../../component-library/hooks';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';

// Internal dependencies
import styleSheet from './AddressCopy.styles';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { getFormattedAddressFromInternalAccount } from '../../../core/Multichain/utils';
import type { AddressCopyProps } from './AddressCopy.types';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { NavigatableRootParamList } from '../../../util/navigation';

const AddressCopy = ({ account, iconColor, hitSlop }: AddressCopyProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } =
    useNavigation<StackNavigationProp<NavigatableRootParamList>>();

  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

  const handleShowAlert = useCallback(
    (config: {
      isVisible: boolean;
      autodismiss: number;
      content: string;
      data: { msg: string };
    }) => dispatch(showAlert(config)),
    [dispatch],
  );

  const handleProtectWalletModalVisible = useCallback(
    () => dispatch(protectWalletModalVisible()),
    [dispatch],
  );

  /**
   * A string that represents the selected address
   */

  const copyAccountToClipboard = useCallback(async () => {
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
  }, [
    account,
    createEventBuilder,
    handleProtectWalletModalVisible,
    handleShowAlert,
    trackEvent,
  ]);

  const navigateToAddressList = useCallback(() => {
    navigate('MultichainAddressList', {
      groupId: selectedAccountGroupId as AccountGroupId,
      title: `${strings('multichain_accounts.address_list.receiving_address')}`,
    });
  }, [navigate, selectedAccountGroupId]);

  const handleOnPress = useCallback(() => {
    if (isMultichainAccountsState2Enabled) {
      navigateToAddressList();
    } else {
      copyAccountToClipboard();
    }
  }, [
    copyAccountToClipboard,
    isMultichainAccountsState2Enabled,
    navigateToAddressList,
  ]);

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
