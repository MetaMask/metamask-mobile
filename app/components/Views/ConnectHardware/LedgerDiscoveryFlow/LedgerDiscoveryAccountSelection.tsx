import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import {
  StackActions,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { KeyringController } from '@metamask/keyring-controller';
import { AccountsController } from '@metamask/accounts-controller';
import type { Device as LedgerDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Engine from '../../../../core/Engine';
import AccountSelector from '../../../UI/HardwareWallet/AccountSelector';
import BlockingActionModal from '../../../UI/BlockingActionModal';
import Text from '../../../Base/Text';
import SelectOptionSheet from '../../../UI/SelectOptionSheet';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAssetFromTheme, useTheme } from '../../../../util/theme';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import ledgerDeviceLightImage from '../../../../images/ledger-device-light.png';
import ledgerDeviceDarkImage from '../../../../images/ledger-device-dark.png';
import {
  forgetLedger,
  getHDPath,
  getLedgerAccounts,
  getLedgerAccountsByOperation,
  setHDPath,
  unlockLedgerWalletAccount,
} from '../../../../core/Ledger/Ledger';
import { setReloadAccounts } from '../../../../actions/accounts';
import { HardwareDeviceTypes } from '../../../../constants/keyringTypes';
import PAGINATION_OPERATIONS from '../../../../constants/pagination';
import { ledgerDeviceUUIDToModelName } from '../../../../util/hardwareWallet/deviceNameUtils';
import useLedgerBluetooth from '../../../hooks/Ledger/useLedgerBluetooth';
import {
  LEDGER_BIP44_PATH,
  LEDGER_BIP44_STRING,
  LEDGER_LEGACY_PATH,
  LEDGER_LEGACY_STRING,
  LEDGER_LIVE_PATH,
  LEDGER_LIVE_STRING,
  LEDGER_UNKNOWN_STRING,
} from '../../../../core/Ledger/constants';
import { toFormattedAddress } from '../../../../util/address';
import { getConnectedDevicesCount } from '../../../../core/HardwareWallets/analytics';
import { isEthAppNotOpenErrorMessage } from '../../../../core/Ledger/ledgerErrors';
import createStyles from '../../LedgerSelectAccount/index.styles';
import SearchingForDevice from '../SearchingForDevice';
import { LedgerDiscoveryNotFoundView } from './LedgerDiscoveryNotFound';

/**
 * Check if error message indicates ETH app is not open and return user-friendly message
 */
const getDisplayErrorMessage = (errorMessage: string): string => {
  if (isEthAppNotOpenErrorMessage(errorMessage)) {
    return strings('ledger.eth_app_not_open_message');
  }
  return errorMessage;
};

interface OptionType {
  key: string;
  label: string;
  value: string;
}

interface LedgerDiscoveryAccountSelectionProps {
  onBack: () => void;
  selectedDevice: LedgerDevice;
}

const LedgerDiscoveryAccountSelection = ({
  onBack,
  selectedDevice,
}: LedgerDiscoveryAccountSelectionProps) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false);
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const styles = createStyles(colors);
  const ledgerThemedImage = useAssetFromTheme(
    ledgerDeviceLightImage,
    ledgerDeviceDarkImage,
  );

  const ledgerModelName = useMemo(() => {
    if (selectedDevice) {
      const [bluetoothServiceId] = selectedDevice.serviceUUIDs;
      return ledgerDeviceUUIDToModelName(bluetoothServiceId);
    }
    return undefined;
  }, [selectedDevice]);

  const ledgerPathOptions: OptionType[] = useMemo(
    () => [
      {
        key: LEDGER_LIVE_PATH,
        label: strings('ledger.ledger_live_path'),
        value: LEDGER_LIVE_PATH,
      },
      {
        key: LEDGER_LEGACY_PATH,
        label: strings('ledger.ledger_legacy_path'),
        value: LEDGER_LEGACY_PATH,
      },
      {
        key: LEDGER_BIP44_PATH,
        label: strings('ledger.ledger_bip44_path'),
        value: LEDGER_BIP44_PATH,
      },
    ],
    [],
  );

  const {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun,
    error: ledgerError,
  } = useLedgerBluetooth(selectedDevice?.id);

  const ledgerLogicToRunRef = useRef(ledgerLogicToRun);
  useEffect(() => {
    ledgerLogicToRunRef.current = ledgerLogicToRun;
  }, [ledgerLogicToRun]);

  const keyringController = useMemo(() => {
    const { KeyringController: controller } = Engine.context as {
      KeyringController: KeyringController;
    };
    return controller;
  }, []);

  const accountsController = useMemo(() => {
    const { AccountsController: controller } = Engine.context as {
      AccountsController: AccountsController;
    };
    return controller;
  }, []);

  const [blockingModalVisible, setBlockingModalVisible] = useState(false);
  const [accounts, setAccounts] = useState<
    { address: string; index: number; balance: string }[]
  >([]);
  const [unlockAccounts, setUnlockAccounts] = useState({
    trigger: false,
    accountIndexes: [] as number[],
  });
  const [forgetDevice, setForgetDevice] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<OptionType>(
    ledgerPathOptions[0],
  );

  useEffect(() => {
    keyringController.getAccounts().then((value: string[]) => {
      setExistingAccounts(value.map(toFormattedAddress));
    });
  }, [keyringController]);

  useEffect(() => {
    if (selectedDevice && accounts.length > 0) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.HARDWARE_WALLET_ACCOUNT_SELECTOR_OPEN,
        )
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            device_model: ledgerModelName,
          })
          .build(),
      );
    }
  }, [
    accounts,
    createEventBuilder,
    ledgerModelName,
    selectedDevice,
    trackEvent,
  ]);

  const onConnectHardware = useCallback(async () => {
    setErrorMsg(null);
    const initialAccounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_FIRST_PAGE,
    );
    setAccounts(initialAccounts);
    setHasLoadedAccounts(true);
  }, []);

  useEffect(() => {
    onConnectHardware().catch((error: Error) => {
      setErrorMsg(getDisplayErrorMessage(error.message));
      setHasLoadedAccounts(true);
    });
  }, [onConnectHardware]);

  useEffect(() => {
    if (accounts.length > 0 && selectedOption) {
      setBlockingModalVisible(true);

      ledgerLogicToRunRef
        .current(async () => {
          try {
            const refreshedAccounts = await getLedgerAccountsByOperation(
              PAGINATION_OPERATIONS.GET_FIRST_PAGE,
            );
            setAccounts(refreshedAccounts);
          } catch (error) {
            setErrorMsg(getDisplayErrorMessage((error as Error).message));
          }
        })
        .finally(() => {
          setBlockingModalVisible(false);
        });
    }
  }, [accounts.length, selectedOption]);

  const nextPage = useCallback(async () => {
    setBlockingModalVisible(true);
    try {
      await ledgerLogicToRun(async () => {
        try {
          const nextAccounts = await getLedgerAccountsByOperation(
            PAGINATION_OPERATIONS.GET_NEXT_PAGE,
          );
          setAccounts(nextAccounts);
        } catch (error) {
          setErrorMsg(getDisplayErrorMessage((error as Error).message));
        }
      });
    } finally {
      setBlockingModalVisible(false);
    }
  }, [ledgerLogicToRun]);

  const prevPage = useCallback(async () => {
    setBlockingModalVisible(true);
    try {
      await ledgerLogicToRun(async () => {
        try {
          const previousAccounts = await getLedgerAccountsByOperation(
            PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
          );
          setAccounts(previousAccounts);
        } catch (error) {
          setErrorMsg(getDisplayErrorMessage((error as Error).message));
        }
      });
    } finally {
      setBlockingModalVisible(false);
    }
  }, [ledgerLogicToRun]);

  const updateNewLegacyAccountsLabel = useCallback(async () => {
    if (LEDGER_LEGACY_PATH === (await getHDPath())) {
      const ledgerAccounts = await getLedgerAccounts();
      const newAddedAccounts = ledgerAccounts.filter(
        (account) => !existingAccounts.includes(toFormattedAddress(account)),
      );

      if (newAddedAccounts.length > 0) {
        for (const address of newAddedAccounts) {
          const account = accountsController.getAccountByAddress(address);
          if (account) {
            accountsController.setAccountName(
              account.id,
              account.metadata.name + strings('ledger.ledger_legacy_label'),
            );
          }
        }
      }
    }
  }, [accountsController, existingAccounts]);

  const getPathString = (value: string) => {
    if (value === LEDGER_LIVE_PATH) {
      return LEDGER_LIVE_STRING;
    } else if (value === LEDGER_LEGACY_PATH) {
      return LEDGER_LEGACY_STRING;
    } else if (value === LEDGER_BIP44_PATH) {
      return LEDGER_BIP44_STRING;
    }
    return LEDGER_UNKNOWN_STRING;
  };

  const closeEntireFlow = useCallback(() => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.goBack();
      return;
    }

    navigation.dispatch(StackActions.popToTop());
  }, [navigation]);

  const onUnlock = useCallback(
    async (accountIndexes: number[]) => {
      setBlockingModalVisible(true);

      try {
        await ledgerLogicToRun(async () => {
          try {
            for (const index of accountIndexes) {
              await unlockLedgerWalletAccount(index);
            }
            const numberOfConnectedDevices = await getConnectedDevicesCount();
            await updateNewLegacyAccountsLabel();

            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ADD_ACCOUNT)
                .addProperties({
                  device_type: HardwareDeviceTypes.LEDGER,
                  device_model: ledgerModelName,
                  hd_path: getPathString(selectedOption.value),
                  connected_device_count: numberOfConnectedDevices.toString(),
                })
                .build(),
            );
            closeEntireFlow();
          } catch (error) {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                .addProperties({
                  device_type: HardwareDeviceTypes.LEDGER,
                  device_model: ledgerModelName,
                  error: (error as Error).message,
                })
                .build(),
            );
            setErrorMsg(getDisplayErrorMessage((error as Error).message));
          }
        });
      } finally {
        setBlockingModalVisible(false);
      }
    },
    [
      closeEntireFlow,
      createEventBuilder,
      ledgerLogicToRun,
      ledgerModelName,
      selectedOption.value,
      trackEvent,
      updateNewLegacyAccountsLabel,
    ],
  );

  const onForget = useCallback(async () => {
    setBlockingModalVisible(true);
    await forgetLedger();
    dispatch(setReloadAccounts(true));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN)
        .addProperties({
          device_type: HardwareDeviceTypes.LEDGER,
          device_model: ledgerModelName,
        })
        .build(),
    );
    setBlockingModalVisible(false);
    closeEntireFlow();
  }, [
    closeEntireFlow,
    createEventBuilder,
    dispatch,
    ledgerModelName,
    trackEvent,
  ]);

  const onAnimationCompleted = useCallback(async () => {
    if (!blockingModalVisible) {
      return;
    }

    if (forgetDevice) {
      await onForget();
      setBlockingModalVisible(false);
      setForgetDevice(false);
    } else if (unlockAccounts.trigger) {
      await onUnlock(unlockAccounts.accountIndexes);
      setBlockingModalVisible(false);
      setUnlockAccounts({ trigger: false, accountIndexes: [] });
    }
  }, [
    blockingModalVisible,
    forgetDevice,
    onForget,
    onUnlock,
    unlockAccounts.accountIndexes,
    unlockAccounts.trigger,
  ]);

  const onSelectedPathChanged = useCallback(
    async (path: string) => {
      const option = ledgerPathOptions.find(
        (pathOption) => pathOption.key === path,
      );
      if (!option) {
        return;
      }

      setSelectedOption(option);
      await setHDPath(path);
    },
    [ledgerPathOptions],
  );

  if (!hasLoadedAccounts && !ledgerError && !errorMsg) {
    return <SearchingForDevice />;
  }

  if ((ledgerError || errorMsg) && accounts.length <= 0) {
    return <LedgerDiscoveryNotFoundView onBack={onBack} />;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={ledgerThemedImage}
            resizeMode="contain"
            style={styles.ledgerIcon}
          />

          <TouchableOpacity onPress={onBack} style={styles.navbarRightButton}>
            <MaterialIcon name="close" size={15} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.selectorContainer}>
          {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
          <Text style={styles.mainTitle}>
            {strings('ledger.select_accounts')}
          </Text>
          <Text style={styles.selectorTitle}>
            {strings('ledger.select_hd_path')}
          </Text>
          <Text style={styles.selectorDescription}>
            {strings('ledger.select_hd_path_description')}
          </Text>
          <View style={styles.pathSelector}>
            <SelectOptionSheet
              options={ledgerPathOptions}
              label={strings('ledger.select_hd_path')}
              onValueChange={async (value) =>
                await onSelectedPathChanged(value)
              }
              selectedValue={selectedOption.value}
            />
          </View>
        </View>
        <AccountSelector
          accounts={accounts}
          selectedAccounts={existingAccounts}
          nextPage={nextPage}
          prevPage={prevPage}
          onUnlock={(accountIndexes: number[]) => {
            setErrorMsg(null);
            setUnlockAccounts({ trigger: true, accountIndexes });
            setBlockingModalVisible(true);
          }}
          onForget={() => {
            setErrorMsg(null);
            setForgetDevice(true);
            setBlockingModalVisible(true);
          }}
        />
      </View>
      <BlockingActionModal
        modalVisible={blockingModalVisible}
        isLoadingAction={
          isSendingLedgerCommands || isAppLaunchConfirmationNeeded
        }
        onAnimationCompleted={onAnimationCompleted}
      >
        <Text style={styles.text}>{strings('common.please_wait')}</Text>
      </BlockingActionModal>
    </>
  );
};

export default LedgerDiscoveryAccountSelection;
