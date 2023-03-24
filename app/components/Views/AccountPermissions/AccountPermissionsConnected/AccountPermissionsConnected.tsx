// Third party dependencies.
import React, { useCallback, useContext, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import PickerNetwork from '../../../../component-library/components/Pickers/PickerNetwork';
import {
  getNetworkNameFromProvider,
  getNetworkImageSource,
} from '../../../../util/networks';
import AccountSelectorList from '../../../../components/UI/AccountSelectorList';
import { toggleNetworkModal } from '../../../../actions/modals';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { switchActiveAccounts } from '../../../../core/Permissions';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import getAccountNameWithENS from '../../../../util/accounts';
import { trackEvent } from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';

// Internal dependencies.
import { AccountPermissionsConnectedProps } from './AccountPermissionsConnected.types';
import styles from './AccountPermissionsConnected.styles';
import {
  CONNECTED_ACCOUNTS_MODAL_CONTAINER,
  CONNECTED_ACCOUNTS_MODAL_NETWORK_PICKER_ID,
} from '../../../../../wdio/screen-objects/testIDs/Components/ConnectedAccountsModal.testIds';

import generateTestId from '../../../../../wdio/utils/generateTestId';

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
  const dispatch = useDispatch();
  const networkController = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController,
  );
  const networkName = useMemo(
    () => getNetworkNameFromProvider(networkController.providerConfig),
    [networkController.providerConfig],
  );
  const networkImageSource = useMemo(() => {
    const { type, chainId } = networkController.providerConfig;
    return getNetworkImageSource({ networkType: type, chainId });
  }, [networkController.providerConfig]);

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
    dispatch(toggleNetworkModal(false));
    trackEvent(MetaMetricsEvents.BROWSER_SWITCH_NETWORK, {
      from_chain_id: networkController.network,
    });
  }, [networkController.network, dispatch]);

  const renderSheetAction = useCallback(
    () => (
      <View style={styles.sheetActionContainer}>
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
      <View
        style={styles.body}
        {...generateTestId(Platform, CONNECTED_ACCOUNTS_MODAL_CONTAINER)}
      >
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
          {...generateTestId(
            Platform,
            CONNECTED_ACCOUNTS_MODAL_NETWORK_PICKER_ID,
          )}
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
