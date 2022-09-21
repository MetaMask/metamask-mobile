// Third party dependencies.
import React, { useCallback, useContext, useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import { getHost } from '../../../../util/browser';
import { useStyles } from '../../../../component-library/hooks';

// Internal dependencies.
import { AccountPermissionsConnectedProps } from './AccountPermissionsConnected.types';
import styleSheet from './AccountPermissionsConnected.styles';
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
  ToastVariant,
} from '../../../../component-library/components/Toast';

const AccountPermissionsConnected = ({
  route,
  ensByAccountAddress,
  accounts,
  isLoading,
  selectedAddresses,
  onSetPermissionsScreen,
  onSetSelectedAddresses,
  onDismissSheet,
}: AccountPermissionsConnectedProps) => {
  const {
    hostInfo: {
      metadata: { origin },
    },
  } = route.params;
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const networkProvider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );
  const networkName = useMemo(
    () => getNetworkNameFromProvider(networkProvider),
    [networkProvider],
  );
  const networkImageSource = useMemo(
    () => getNetworkImageSource(networkProvider.chainId),
    [networkProvider.chainId],
  );
  const activeAddress = selectedAddresses[0];
  const { toastRef } = useContext(ToastContext);

  /**
   * Get image url from favicon api.
   */
  const getFavicon: ImageSourcePropType = useMemo(() => {
    const iconUrl = `https://api.faviconkit.com/${getHost(origin)}/64`;
    return { uri: iconUrl };
  }, [origin]);

  const onConnectMoreAccounts = useCallback(() => {
    onSetSelectedAddresses([]);
    onSetPermissionsScreen(AccountPermissionsScreens.Connect);
  }, [onSetSelectedAddresses, onSetPermissionsScreen]);

  const openRevokePermissions = () =>
    onSetPermissionsScreen(AccountPermissionsScreens.Revoke);

  const switchActiveAccount = useCallback(
    (address: string) => {
      if (address !== activeAddress) {
        switchActiveAccounts(origin, address);
      }
      onDismissSheet();
      const newActiveAccount = accounts.find(
        ({ address: accAddress }) => address === accAddress,
      );
      toastRef?.current?.showToast({
        variant: ToastVariant.Account,
        labelOptions: [
          { label: `Switched to account` },
          { label: ` ${newActiveAccount?.name}`, isBold: true },
          { label: '.' },
        ],
        accountAddress: address,
      });
    },
    [activeAddress, onDismissSheet, accounts],
  );

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
      <View style={styles.body}>
        <TagUrl
          imageSource={getFavicon}
          label={origin}
          cta={{
            label: strings('accounts.permissions'),
            onPress: openRevokePermissions,
          }}
        />
        <PickerNetwork
          label={networkName}
          imageSource={networkImageSource}
          onPress={() => dispatch(toggleNetworkModal(false))}
          style={styles.networkPicker}
        />
      </View>
      <AccountSelectorList
        onSelectAccount={switchActiveAccount}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
        selectedAddresses={selectedAddresses}
      />
      {renderSheetAction()}
    </>
  );
};

export default AccountPermissionsConnected;
