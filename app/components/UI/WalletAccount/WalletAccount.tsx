// Third parties dependencies
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
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
import {
  doENSReverseLookup,
  isDefaultAccountName,
} from '../../../util/ENSUtils';
import { selectChainId } from '../../../selectors/networkController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../selectors/preferencesController';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon/ButtonIcon';
import { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import Routes from '../../../constants/navigation/Routes';

// Internal dependencies
import styleSheet from './WalletAccount.styles';
import { WalletAccountProps } from './WalletAccount.types';
import {
  WALLET_ACCOUNT_ICON,
  MAIN_WALLET_ACCOUNT_ACTIONS,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';

const WalletAccount = ({ style }: WalletAccountProps, ref: React.Ref<any>) => {
  const { styles } = useStyles(styleSheet, { style });

  const { navigate } = useNavigation();
  const [ens, setEns] = useState<string>();

  const yourAccountRef = useRef(null);
  const accountActionsRef = useRef(null);

  useImperativeHandle(ref, () => ({
    yourAccountRef,
    accountActionsRef,
  }));
  /**
   * A string that represents the selected address
   */
  const selectedAddress = useSelector(selectSelectedAddress);

  /**
   * An object containing each identity in the format address => account
   */
  const identities = useSelector(selectIdentities);

  const chainId = useSelector(selectChainId);

  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const account = {
    address: selectedAddress,
    ...identities[selectedAddress],
  };

  const lookupEns = useCallback(async () => {
    try {
      const accountEns = await doENSReverseLookup(account.address, chainId);

      setEns(accountEns);
      // eslint-disable-next-line no-empty
    } catch {}
  }, [account.address, chainId]);

  useEffect(() => {
    lookupEns();
  }, [lookupEns]);

  const onNavigateToAccountActions = () => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_ACTIONS,
    });
  };

  return (
    <View style={styles.base}>
      <PickerAccount
        ref={yourAccountRef}
        accountAddress={account.address}
        accountName={
          isDefaultAccountName(account.name) && ens ? ens : account.name
        }
        accountAvatarType={accountAvatarType}
        onPress={() => {
          navigate(...createAccountSelectorNavDetails({}));
        }}
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
