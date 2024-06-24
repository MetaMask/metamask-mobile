// Third parties dependencies
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Platform, View } from 'react-native';

// External dependencies
import { IconName } from '../../../component-library/components/Icons/Icon';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';
import { useStyles } from '../../../component-library/hooks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import AddressCopy from '../AddressCopy';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon/ButtonIcon';
import { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import Routes from '../../../constants/navigation/Routes';
import {
  WALLET_ACCOUNT_ICON,
  MAIN_WALLET_ACCOUNT_ACTIONS,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { getLabelTextByAddress } from '../../../util/address';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import useEnsNameByAddress from '../../../components/hooks/useEnsNameByAddress';
import Logger from '../../../util/Logger';

// Internal dependencies
import styleSheet from './WalletAccount.styles';
import { WalletAccountProps } from './WalletAccount.types';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WalletAccount = ({ style }: WalletAccountProps, ref: React.Ref<any>) => {
  const { styles } = useStyles(styleSheet, { style });

  const { navigate } = useNavigation();
  const yourAccountRef = useRef(null);
  const accountActionsRef = useRef(null);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const { ensName } = useEnsNameByAddress(selectedAccount?.address);
  const defaultName = selectedAccount?.metadata?.name;
  const accountName = useMemo(
    () =>
      (isDefaultAccountName(defaultName) && ensName ? ensName : defaultName) ||
      '',
    [defaultName, ensName],
  );

  useImperativeHandle(ref, () => ({
    yourAccountRef,
    accountActionsRef,
  }));

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const onNavigateToAccountActions = () => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_ACTIONS,
    });
  };

  if (!selectedAccount) {
    const undefinedAccountError = new Error(
      'selectedAccount is undefined on WalletAccount!',
    );
    Logger.error(undefinedAccountError);
    return null;
  }

  return (
    <View style={styles.base}>
      <PickerAccount
        ref={yourAccountRef}
        accountAddress={selectedAccount.address}
        accountName={accountName}
        accountAvatarType={accountAvatarType}
        onPress={() => {
          navigate(...createAccountSelectorNavDetails({}));
        }}
        accountTypeLabel={getLabelTextByAddress(selectedAccount.address)}
        showAddress={false}
        cellAccountContainerStyle={styles.account}
        style={styles.accountPicker}
        {...generateTestId(Platform, WALLET_ACCOUNT_ICON)}
      />
      <View style={styles.middleBorder} />
      <View style={styles.addressContainer} ref={accountActionsRef}>
        <AddressCopy formatAddressType="short" />
        <ButtonIcon
          iconName={IconName.MoreHorizontal}
          size={ButtonIconSizes.Sm}
          onPress={onNavigateToAccountActions}
          {...generateTestId(Platform, MAIN_WALLET_ACCOUNT_ACTIONS)}
        />
      </View>
    </View>
  );
};
export default forwardRef(WalletAccount);
