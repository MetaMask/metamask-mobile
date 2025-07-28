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
import { InternalAccount } from '@metamask/keyring-internal-api';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';

import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectProviderConfig } from '../../../selectors/networkController';
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
  isHDOrFirstPartySnapAccount,
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
import { useEIP7702Networks } from '../confirmations/hooks/7702/useEIP7702Networks';
import { isEvmAccountType } from '@metamask/keyring-api';
import { toHex } from '@metamask/controller-utils';
import { getMultichainBlockExplorer } from '../../../core/Multichain/networks';

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
  const { networkSupporting7702Present } = useEIP7702Networks(
    selectedAccount.address,
  );

  const [blockingModalVisible, setBlockingModalVisible] = useState(false);

  const controllers = useMemo(() => {
    const { KeyringController, PreferencesController } = Engine.context;
    return { KeyringController, PreferencesController };
  }, []);

  const keyringId = useMemo(
    () => selectedAccount.options.entropySource,
    [selectedAccount.options.entropySource],
  );

  const providerConfig = useSelector(selectProviderConfig);

  const selectedAddress = selectedAccount?.address;
  const keyring = selectedAccount?.metadata.keyring;

  const blockExplorer:
    | {
        url: string;
        title: string;
        blockExplorerName: string;
      }
    | undefined = useMemo(
    () => getMultichainBlockExplorer(selectedAccount),
    [selectedAccount],
  );

  const goToBrowserUrl = (url: string, title: string) => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  };

  const viewOnBlockExplorer = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      if (blockExplorer) {
        goToBrowserUrl(blockExplorer.url, blockExplorer.title);
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

  const goToSwitchAccountType = () => {
    navigate(Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE, {
      screen: Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE,
      params: {
        address: selectedAddress,
      },
    });
  };

  const goToExportSRP = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SRP_REVEAL_QUIZ,
        keyringId,
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
      const hexSelectedAddress = toHex(selectedAddress);
      await removeAccountsFromPermissions([hexSelectedAddress]);
      await controllers.KeyringController.removeAccount(hexSelectedAddress);
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
      const hexSelectedAddress = toHex(selectedAddress);
      await removeAccountsFromPermissions([hexSelectedAddress]);
      await controllers.KeyringController.removeAccount(hexSelectedAddress);
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

      sheetRef.current?.onCloseBottomSheet(async () => {
        await removeHardwareAccount();

        await selectFirstAccount();

        await forgetDeviceIfRequired();

        setBlockingModalVisible(false);
      });
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
    navigate(Routes.EDIT_ACCOUNT_NAME, { selectedAccount });
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
        {isExplorerVisible && blockExplorer && (
          <AccountAction
            actionTitle={`${strings('drawer.view_in')} ${
              blockExplorer.blockExplorerName
            }`}
            iconName={IconName.Export}
            onPress={viewOnBlockExplorer}
            testID={AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN}
          />
        )}
        <AccountAction
          actionTitle={strings('drawer.share_address')}
          iconName={IconName.Share}
          onPress={onShare}
          testID={AccountActionsBottomSheetSelectorsIDs.SHARE_ADDRESS}
        />
        {selectedAddress && isEvmAccountType(selectedAccount.type) && (
          <AccountAction
            actionTitle={strings('account_details.show_private_key')}
            iconName={IconName.Key}
            onPress={goToExportPrivateKey}
            testID={AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY}
          />
        )}
        {selectedAddress && isHDOrFirstPartySnapAccount(selectedAccount) && (
          <AccountAction
            actionTitle={strings('accounts.reveal_secret_recovery_phrase')}
            iconName={IconName.Key}
            onPress={goToExportSRP}
            testID={
              AccountActionsBottomSheetSelectorsIDs.SHOW_SECRET_RECOVERY_PHRASE
            }
          />
        )}
        {selectedAddress && isHardwareAccount(selectedAddress) && (
          <AccountAction
            actionTitle={strings('accounts.remove_hardware_account')}
            iconName={IconName.Close}
            onPress={showRemoveHWAlert}
            testID={
              AccountActionsBottomSheetSelectorsIDs.REMOVE_HARDWARE_ACCOUNT
            }
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
        {networkSupporting7702Present &&
          !isHardwareAccount(selectedAddress) && (
            <AccountAction
              actionTitle={strings('account_actions.switch_to_smart_account')}
              iconName={IconName.SwapHorizontal}
              onPress={goToSwitchAccountType}
              testID={
                AccountActionsBottomSheetSelectorsIDs.SWITCH_TO_SMART_ACCOUNT
              }
            />
          )}
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
