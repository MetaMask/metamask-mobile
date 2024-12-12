// Third party dependencies.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, View, Text } from 'react-native';
import {
  useNavigation,
  RouteProp,
  ParamListBase,
  useRoute,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Share from 'react-native-share';

// External dependencies
import { InternalAccount } from '@metamask/keyring-api';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../../util/networks';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
} from '../../../util/etherscan';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { RPC } from '../../../constants/network';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { strings } from '../../../../locales/i18n';
// Internal dependencies
import styleSheet from './AccountActions.styles';
import Logger from '../../../util/Logger';
import { protectWalletModalVisible } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
import { AccountActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountActionsBottomSheet.selectors';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  isHardwareAccount,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  isSnapAccount,
  ///: END:ONLY_INCLUDE_IF
} from '../../../util/address';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import ExtendedKeyringTypes, {
  HardwareDeviceTypes,
} from '../../../constants/keyringTypes';
import { forgetLedger } from '../../../core/Ledger/Ledger';
import Engine from '../../../core/Engine';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { useTheme } from '../../../util/theme';
import { Hex } from '@metamask/utils';

interface AccountActionsParams {
  selectedAccount: InternalAccount;
}

const AccountActions = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const { selectedAccount } = route.params as AccountActionsParams;
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();

  const [blockingModalVisible, setBlockingModalVisible] = useState(false);

  const controllers = useMemo(() => {
    const { KeyringController, PreferencesController } = Engine.context;
    return { KeyringController, PreferencesController };
  }, []);

  const providerConfig = useSelector(selectProviderConfig);

  const selectedAddress = selectedAccount?.address;
  const keyring = selectedAccount?.metadata.keyring;

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const blockExplorer = useMemo(() => {
    if (providerConfig?.rpcUrl && providerConfig.type === RPC) {
      return findBlockExplorerForRpc(
        providerConfig.rpcUrl,
        networkConfigurations,
      );
    }
    return null;
  }, [networkConfigurations, providerConfig.rpcUrl, providerConfig.type]);

  const blockExplorerName = getBlockExplorerName(blockExplorer);

  const goToBrowserUrl = (url: string, title: string) => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  };

  const viewInEtherscan = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      if (blockExplorer) {
        const url = `${blockExplorer}/address/${selectedAddress}`;
        const title = new URL(blockExplorer).hostname;
        goToBrowserUrl(url, title);
      } else {
        const url = getEtherscanAddressUrl(
          providerConfig.type,
          selectedAddress,
        );
        const etherscan_url = getEtherscanBaseUrl(providerConfig.type).replace(
          'https://',
          '',
        );
        goToBrowserUrl(url, etherscan_url);
      }

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.NAVIGATION_TAPS_VIEW_ETHERSCAN,
        ).build(),
      );
    });
  };

  const onShare = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      Share.open({
        message: selectedAddress,
      })
        .then(() => {
          dispatch(protectWalletModalVisible());
        })
        .catch((err) => {
          Logger.log('Error while trying to share address', err);
        });

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS,
        ).build(),
      );
    });
  };

  const goToExportPrivateKey = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.REVEAL_PRIVATE_KEY_INITIATED,
        ).build(),
      );

      navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
        credentialName: 'private_key',
        shouldUpdateNav: true,
        selectedAccount,
      });
    });
  };

  const showRemoveHWAlert = useCallback(() => {
    Alert.alert(
      strings('accounts.remove_hardware_account'),
      strings('accounts.remove_hw_account_alert_description'),
      [
        {
          text: strings('accounts.remove_account_alert_cancel_btn'),
          style: 'cancel',
        },
        {
          text: strings('accounts.remove_account_alert_remove_btn'),
          onPress: async () => {
            setBlockingModalVisible(true);
          },
        },
      ],
    );
  }, []);

  /**
   * Remove the hardware account from the keyring
   * @param keyring - The keyring object
   * @param address - The address to remove
   */
  const removeHardwareAccount = useCallback(async () => {
    if (selectedAddress) {
      await controllers.KeyringController.removeAccount(selectedAddress as Hex);
      await removeAccountsFromPermissions([selectedAddress]);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ACCOUNT_REMOVED)
          .addProperties({
            accountType: keyring?.type,
            selectedAddress,
          })
          .build(),
      );
    }
  }, [
    controllers.KeyringController,
    keyring?.type,
    selectedAddress,
    trackEvent,
    createEventBuilder,
  ]);

  /**
   * Selects the first account after removing the previous selected account
   */
  const selectFirstAccount = useCallback(async () => {
    const accounts = await controllers.KeyringController.getAccounts();
    if (accounts && accounts.length > 0) {
      Engine.setSelectedAddress(accounts[0]);
    }
  }, [controllers.KeyringController]);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)

  /**
   * Remove the snap account from the keyring
   */
  const removeSnapAccount = useCallback(async () => {
    if (selectedAddress) {
      await controllers.KeyringController.removeAccount(selectedAddress as Hex);
      await removeAccountsFromPermissions([selectedAddress]);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ACCOUNT_REMOVED)
          .addProperties({
            accountType: keyring?.type,
            selectedAddress,
          })
          .build(),
      );
    }
  }, [
    controllers.KeyringController,
    keyring?.type,
    selectedAddress,
    trackEvent,
    createEventBuilder,
  ]);

  const showRemoveSnapAccountAlert = useCallback(() => {
    Alert.alert(
      strings('accounts.remove_snap_account'),
      strings('accounts.remove_snap_account_alert_description'),
      [
        {
          text: strings('accounts.remove_account_alert_cancel_btn'),
          style: 'cancel',
        },
        {
          text: strings('accounts.remove_account_alert_remove_btn'),
          onPress: async () => {
            sheetRef.current?.onCloseBottomSheet(async () => {
              await removeSnapAccount();
            });
          },
        },
      ],
    );
  }, [removeSnapAccount]);
  ///: END:ONLY_INCLUDE_IF

  /**
   * Forget the device if there are no more accounts in the keyring
   * @param keyringType - The keyring type
   */
  const forgetDeviceIfRequired = useCallback(async () => {
    // re-fetch the latest keyrings from KeyringController state.
    const { keyrings } = controllers.KeyringController.state;
    const keyringType = keyring?.type;
    const updatedKeyring = keyrings.find((kr) => kr.type === keyringType);

    // If there are no more accounts in the keyring, forget the device
    let requestForgetDevice = false;

    if (updatedKeyring) {
      if (updatedKeyring.accounts.length === 0) {
        requestForgetDevice = true;
      }
    } else {
      requestForgetDevice = true;
    }
    if (requestForgetDevice) {
      switch (keyringType) {
        case ExtendedKeyringTypes.ledger:
          await forgetLedger();
          trackEvent(
            createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN)
              .addProperties({
                device_type: HardwareDeviceTypes.LEDGER,
              })
              .build(),
          );
          break;
        case ExtendedKeyringTypes.qr:
          await controllers.KeyringController.forgetQRDevice();
          trackEvent(
            createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN)
              .addProperties({
                device_type: HardwareDeviceTypes.QR,
              })
              .build(),
          );
          break;
        default:
          break;
      }
    }
  }, [
    controllers.KeyringController,
    keyring?.type,
    trackEvent,
    createEventBuilder,
  ]);

  /**
   * Trigger the remove hardware account action when user click on the remove account button
   */
  const triggerRemoveHWAccount = useCallback(async () => {
    if (blockingModalVisible && selectedAddress) {
      if (!keyring) {
        console.error('Keyring not found for address:', selectedAddress);
        return;
      }

      await removeHardwareAccount();

      await selectFirstAccount();

      await forgetDeviceIfRequired();

      setBlockingModalVisible(false);
    }
  }, [
    blockingModalVisible,
    forgetDeviceIfRequired,
    keyring,
    removeHardwareAccount,
    selectFirstAccount,
    selectedAddress,
  ]);

  const goToEditAccountName = () => {
    navigate('EditAccountName', { selectedAccount });
  };

  const isExplorerVisible = Boolean(
    (providerConfig.type === 'rpc' && blockExplorer) ||
      providerConfig.type !== 'rpc',
  );

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.actionsContainer}>
        <AccountAction
          actionTitle={strings('account_actions.edit_name')}
          iconName={IconName.Edit}
          onPress={goToEditAccountName}
          testID={AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT}
        />
        {isExplorerVisible && (
          <AccountAction
            actionTitle={
              (blockExplorer &&
                `${strings('drawer.view_in')} ${blockExplorerName}`) ||
              strings('drawer.view_in_etherscan')
            }
            iconName={IconName.Export}
            onPress={viewInEtherscan}
            testID={AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN}
          />
        )}
        <AccountAction
          actionTitle={strings('drawer.share_address')}
          iconName={IconName.Share}
          onPress={onShare}
          testID={AccountActionsBottomSheetSelectorsIDs.SHARE_ADDRESS}
        />
        <AccountAction
          actionTitle={strings('account_details.show_private_key')}
          iconName={IconName.Key}
          onPress={goToExportPrivateKey}
          testID={AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY}
        />
        {selectedAddress && isHardwareAccount(selectedAddress) && (
          <AccountAction
            actionTitle={strings('accounts.remove_hardware_account')}
            iconName={IconName.Close}
            onPress={showRemoveHWAlert}
            testID={AccountActionsBottomSheetSelectorsIDs.REMOVE_HARDWARE_ACCOUNT}
          />
        )}
        {
          ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          selectedAddress && isSnapAccount(selectedAddress) && (
            <AccountAction
              actionTitle={strings('accounts.remove_snap_account')}
              iconName={IconName.Close}
              onPress={showRemoveSnapAccountAlert}
              testID={AccountActionsBottomSheetSelectorsIDs.REMOVE_SNAP_ACCOUNT}
            />
          )
          ///: END:ONLY_INCLUDE_IF
        }
      </View>
      <BlockingActionModal
        modalVisible={blockingModalVisible}
        isLoadingAction
        onAnimationCompleted={triggerRemoveHWAccount}
      >
        <Text style={styles.text}>{strings('common.please_wait')}</Text>
      </BlockingActionModal>
    </BottomSheet>
  );
};

export default AccountActions;
