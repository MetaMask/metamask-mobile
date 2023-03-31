import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { formatAddress } from '../../../util/address';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { useNavigation } from '@react-navigation/native';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';
import { strings } from '../../../../locales/i18n';
import { InteractionManager, View } from 'react-native';
import { Analytics, MetaMetricsEvents } from '../../../core/Analytics';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';

import { useStyles } from '../../../component-library/hooks';
import styleSheet from './WalletAccount.styles';
import { WalletAccountProps } from './WalletAccount.types';

const WalletAccount = ({ style }: WalletAccountProps) => {
  const { styles } = useStyles(styleSheet, { style });

  const { navigate } = useNavigation();
  const dispatch = useDispatch();

  const handleShowAlert = (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config));

  const handleProtectWalletModalVisible = () =>
    dispatch(protectWalletModalVisible());

  /**
   * Map of accounts to information objects including balances
   */
  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  /**
   * A string that represents the selected address
   */
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  /**
   * An object containing each identity in the format address => account
   */
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const account = {
    address: selectedAddress,
    ...identities[selectedAddress],
    ...accounts[selectedAddress],
  };
  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(selectedAddress);
    handleShowAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
    setTimeout(() => handleProtectWalletModalVisible(), 2000);
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.WALLET_COPIED_ADDRESS);
    });
  };
  return (
    <View style={styles.base}>
      <PickerAccount
        accountAddress={account.address}
        accountName={account.name}
        accountAvatarType={accountAvatarType}
        onPress={() => {
          navigate(...createAccountSelectorNavDetails({}));
        }}
        showAddress={false}
        cellAccountContainerStyle={styles.account}
        style={styles.accountPicker}
      />
      <View style={styles.middleBorder} />
      <View style={styles.addressContainer}>
        <View style={styles.address}>
          <Text variant={TextVariant.BodySMBold}>Address:</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={copyAccountToClipboard}
          >
            <Text color={TextColor.Primary} variant={TextVariant.BodySM}>
              {formatAddress(account.address, 'short')}
            </Text>
            <Icon
              name={IconName.Copy}
              size={IconSize.Sm}
              color={IconColor.Primary}
            />
          </TouchableOpacity>
        </View>

        <Icon name={IconName.Ellipsis} size={IconSize.Sm} />
      </View>
    </View>
  );
};
export default WalletAccount;
