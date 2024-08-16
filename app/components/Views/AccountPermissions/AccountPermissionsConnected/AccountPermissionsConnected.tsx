// Third party dependencies.
import React, { useCallback, useContext } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ProviderConfig } from '@metamask/network-controller';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import PickerNetwork from '../../../../component-library/components/Pickers/PickerNetwork';
import { getDecimalChainId } from '../../../../util/networks';
import AccountSelectorList from '../../../../components/UI/AccountSelectorList';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { switchActiveAccounts } from '../../../../core/Permissions';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import getAccountNameWithENS from '../../../../util/accounts';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { selectProviderConfig } from '../../../../selectors/networkController';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../../selectors/networkInfos';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Modals/ConnectedAccountModal.selectors';

// Internal dependencies.
import { AccountPermissionsConnectedProps } from './AccountPermissionsConnected.types';
import styles from './AccountPermissionsConnected.styles';
import { useMetrics } from '../../../../components/hooks/useMetrics';

const AccountPermissionsConnected = ({
  ensByAccountAddress,
  accounts,
  isLoading,
  selectedAddresses,
  onSetPermissionsScreen,
  onSetSelectedAddresses,
  onDismissSheet,
  hostname,
  favicon,
  secureIcon,
  accountAvatarType,
  urlWithProtocol,
}: AccountPermissionsConnectedProps) => {
  const { navigate } = useNavigation();
  const { trackEvent } = useMetrics();

  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const networkName = useSelector(selectNetworkName);
  const networkImageSource = useSelector(selectNetworkImageSource);

  const activeAddress = selectedAddresses[0];
  const { toastRef } = useContext(ToastContext);

  const onConnectMoreAccounts = useCallback(() => {
    onSetSelectedAddresses([]);
    onSetPermissionsScreen(AccountPermissionsScreens.Connect);
  }, [onSetSelectedAddresses, onSetPermissionsScreen]);

  const openRevokePermissions = () =>
    onSetPermissionsScreen(AccountPermissionsScreens.Revoke);

  const switchActiveAccount = useCallback(
    (address: string) => {
      if (address !== activeAddress) {
        switchActiveAccounts(hostname, address);
      }
      onDismissSheet();
      const activeAccountName = getAccountNameWithENS({
        accountAddress: address,
        accounts,
        ensByAccountAddress,
      });
      toastRef?.current?.showToast({
        variant: ToastVariants.Account,
        labelOptions: [
          {
            label: `${activeAccountName} `,
            isBold: true,
          },
          { label: strings('toast.now_active') },
        ],
        accountAddress: address,
        accountAvatarType,
        hasNoTimeout: false,
      });
    },
    [
      activeAddress,
      onDismissSheet,
      accounts,
      ensByAccountAddress,
      hostname,
      toastRef,
      accountAvatarType,
    ],
  );

  const switchNetwork = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });

    trackEvent(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED, {
      chain_id: getDecimalChainId(providerConfig.chainId),
    });
  }, [providerConfig.chainId, navigate, trackEvent]);

  const renderSheetAction = useCallback(
    () => (
      <View
        style={styles.sheetActionContainer}
        testID={ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON}
      >
        <SheetActions
          actions={[
            {
              label: strings('accounts.connect_more_accounts'),
              onPress: onConnectMoreAccounts,
              disabled: isLoading,
            },
          ]}
        />
      </View>
    ),
    [onConnectMoreAccounts, isLoading],
  );

  return (
    <>
      <SheetHeader title={strings('accounts.connected_accounts_title')} />
      <View style={styles.body}>
        <TagUrl
          imageSource={favicon}
          label={urlWithProtocol}
          cta={{
            label: strings('accounts.permissions'),
            onPress: openRevokePermissions,
          }}
          iconName={secureIcon}
        />
        <PickerNetwork
          label={networkName}
          imageSource={networkImageSource}
          onPress={switchNetwork}
          style={styles.networkPicker}
          testID={ConnectedAccountsSelectorsIDs.NETWORK_PICKER}
        />
      </View>
      <AccountSelectorList
        onSelectAccount={switchActiveAccount}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
        selectedAddresses={selectedAddresses}
        isRemoveAccountEnabled
      />
      {renderSheetAction()}
    </>
  );
};

export default AccountPermissionsConnected;
