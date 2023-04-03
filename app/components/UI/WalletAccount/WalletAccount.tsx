// Third parties dependencies
import React from 'react';
import { useSelector } from 'react-redux';

// External dependencies
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { useNavigation } from '@react-navigation/native';
import { Platform, View } from 'react-native';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';
import { useStyles } from '../../../component-library/hooks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import AddressCopy from '../AddressCopy';

// Internal dependencies
import styleSheet from './WalletAccount.styles';
import { WalletAccountProps } from './WalletAccount.types';

const WalletAccount = ({ style }: WalletAccountProps) => {
  const { styles } = useStyles(styleSheet, { style });

  const { navigate } = useNavigation();

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
        {...generateTestId(Platform, 'account-picker')}
      />
      <View style={styles.middleBorder} />
      <View style={styles.addressContainer}>
        <AddressCopy formatAddressType="short" />

        <Icon name={IconName.MoreHorizontal} size={IconSize.Sm} />
      </View>
    </View>
  );
};
export default WalletAccount;
