// Third parties dependencies
import React from 'react';
import { useDispatch } from 'react-redux';

// External dependencies
import { View } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useStyles } from '../../../component-library/hooks';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { InternalAccount } from '@metamask/keyring-internal-api';

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

  return (
    <View style={styles.address}>
      <ButtonIcon
        iconName={IconName.Copy}
        size={ButtonIconSize.Lg}
        iconProps={iconColor && { color: iconColor }}
        onPress={copyAccountToClipboard}
        testID={WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON}
        hitSlop={hitSlop}
      />
    </View>
  );
};
export default AddressCopy;
