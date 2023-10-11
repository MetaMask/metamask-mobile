// Third parties dependencies
import { useNavigation } from '@react-navigation/native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import { useSelector } from 'react-redux';
// External dependencies
import generateTestId from '../../../../wdio/utils/generateTestId';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import { useStyles } from '../../../component-library/hooks';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';
import Routes from '../../../constants/navigation/Routes';
import { selectChainId } from '../../../selectors/networkController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../selectors/preferencesController';
import {
  doENSReverseLookup,
  isDefaultAccountName,
} from '../../../util/ENSUtils';
import AddressCopy from '../AddressCopy';

// Internal dependencies
import {
  MAIN_WALLET_ACCOUNT_ACTIONS,
  WALLET_ACCOUNT_ICON,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { KEYRING_LEDGER } from '../../../core/Ledger/Ledger';
import { isHardwareAccount } from '../../../util/address';
import styleSheet from './WalletAccount.styles';
import { WalletAccountProps } from './WalletAccount.types';

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
    ...identities[selectedAddress],
    address: selectedAddress,
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
        //Currently only show account type label for ledger accounts for unknown reasons
        //TODO: should display account type label for all hardware wallets and imported accounts after confirmed
        accountTypeLabel={
          isHardwareAccount(account.address, [KEYRING_LEDGER])
            ? 'accounts.ledger'
            : ''
        }
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
