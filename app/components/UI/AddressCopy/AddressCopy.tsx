// Third parties dependencies
import React, { useCallback, useContext } from 'react';
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
import { protectWalletModalVisible } from '../../../actions/user';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../component-library/components/Icons/Icon';

import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useStyles } from '../../../component-library/hooks';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';
import { createAddressListNavigationDetails } from '../../Views/MultichainAccounts/AddressList';

// Internal dependencies
import styleSheet from './AddressCopy.styles';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useTheme } from '../../../util/theme';
import { getFormattedAddressFromInternalAccount } from '../../../core/Multichain/utils';
import type { AddressCopyProps } from './AddressCopy.types';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';

const AddressCopy = ({ account, iconColor, hitSlop }: AddressCopyProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
  const { colors } = useTheme();

  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { toastRef } = useContext(ToastContext);

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

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
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ComponentLibraryIconName.CheckBold,
      iconColor: colors.accent03.dark,
      backgroundColor: colors.accent03.normal,
      labelOptions: [
        { label: strings('account_details.account_copied_to_clipboard') },
      ],
      hasNoTimeout: false,
    });
    setTimeout(() => handleProtectWalletModalVisible(), 2000);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_COPIED_ADDRESS).build(),
    );
  }, [
    account,
    colors.accent03.dark,
    colors.accent03.normal,
    createEventBuilder,
    handleProtectWalletModalVisible,
    toastRef,
    trackEvent,
  ]);

  const navigateToAddressList = useCallback(() => {
    // Start the trace before navigating to the address list to include the
    // navigation and render times in the trace.
    trace({
      name: TraceName.ShowAccountAddressList,
      op: TraceOperation.AccountUi,
      tags: {
        screen: 'navbar.copy_address',
      },
    });

    navigate(
      ...createAddressListNavigationDetails({
        groupId: selectedAccountGroupId as AccountGroupId,
        title: `${strings(
          'multichain_accounts.address_list.receiving_address',
        )}`,
        onLoad: () => {
          endTrace({ name: TraceName.ShowAccountAddressList });
        },
      }),
    );
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
