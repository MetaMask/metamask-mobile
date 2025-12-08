import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Engine from '../../../core/Engine';
import AccountSelector from '../../UI/HardwareWallet/AccountSelector';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAssetFromTheme, useTheme } from '../../../util/theme';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import ledgerDeviceLightImage from '../../../images/ledger-device-light.png';
import ledgerDeviceDarkImage from '../../../images/ledger-device-dark.png';
import {
  forgetLedger,
  getHDPath,
  getLedgerAccounts,
  getLedgerAccountsByOperation,
  setHDPath,
  unlockLedgerWalletAccount,
} from '../../../core/Ledger/Ledger';
import LedgerConnect from '../LedgerConnect';
import { setReloadAccounts } from '../../../actions/accounts';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { KeyringController } from '@metamask/keyring-controller';
import { StackNavigationProp } from '@react-navigation/stack';
import createStyles from './index.styles';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PAGINATION_OPERATIONS from '../../../constants/pagination';
import { Device as LedgerDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import { ledgerDeviceUUIDToModelName } from '../../../util/hardwareWallet/deviceNameUtils';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import {
  LEDGER_BIP44_PATH,
  LEDGER_BIP44_STRING,
  LEDGER_LEGACY_PATH,
  LEDGER_LEGACY_STRING,
  LEDGER_LIVE_PATH,
  LEDGER_LIVE_STRING,
  LEDGER_UNKNOWN_STRING,
} from '../../../core/Ledger/constants';
import SelectOptionSheet from '../../UI/SelectOptionSheet';
import { AccountsController } from '@metamask/accounts-controller';
import { toFormattedAddress } from '../../../util/address';
import { getConnectedDevicesCount } from '../../../core/HardwareWallets/analytics';

interface OptionType {
  key: string;
  label: string;
  value: string;
}

const LedgerSelectAccount = () => {
  const navigation = useNavigation<StackNavigationProp<never>>();
  const [selectedDevice, setSelectedDevice] = useState<LedgerDevice>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
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
    if (ledgerError) {
      setBlockingModalVisible(false);
    }
  }, [ledgerError]);

  const showLoadingModal = () => {
    setErrorMsg(null);
    setBlockingModalVisible(true);
  };

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
    trackEvent,
    createEventBuilder,
    selectedDevice,
    accounts,
    ledgerModelName,
  ]);

  const onConnectHardware = useCallback(async () => {
    setErrorMsg(null);

    const _accounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_FIRST_PAGE,
    );
    setAccounts(_accounts);
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && selectedOption) {
      showLoadingModal();

      getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE)
        .then((_accounts) => {
          setAccounts(_accounts);
        })
        .catch((e) => {
          setErrorMsg(e.message);
        })
        .finally(() => {
          setBlockingModalVisible(false);
        });
    }
  }, [accounts.length, selectedOption]);

  const nextPage = useCallback(async () => {
    showLoadingModal();
    const _accounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_NEXT_PAGE,
    );
    setAccounts(_accounts);
    setBlockingModalVisible(false);
  }, []);

  const prevPage = useCallback(async () => {
    showLoadingModal();
    const _accounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
    );
    setAccounts(_accounts);
    setBlockingModalVisible(false);
  }, []);

  const updateNewLegacyAccountsLabel = useCallback(async () => {
    if (LEDGER_LEGACY_PATH === (await getHDPath())) {
      const ledgerAccounts = await getLedgerAccounts();
      const newAddedAccounts = ledgerAccounts.filter(
        (account) => !existingAccounts.includes(toFormattedAddress(account)),
      );

      if (newAddedAccounts.length > 0) {
        // get existing account label
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

  const onUnlock = useCallback(
    async (accountIndexes: number[]) => {
      showLoadingModal();

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
        navigation.pop(2);
      } catch (err) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              device_type: HardwareDeviceTypes.LEDGER,
              device_model: ledgerModelName,
              error: (err as Error).message,
            })
            .build(),
        );
        setErrorMsg((err as Error).message);
      } finally {
        setBlockingModalVisible(false);
      }
    },
    [
      updateNewLegacyAccountsLabel,
      ledgerModelName,
      trackEvent,
      createEventBuilder,
      selectedOption.value,
      navigation,
    ],
  );

  const onForget = useCallback(async () => {
    showLoadingModal();
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
    navigation.dispatch(StackActions.pop(2));
  }, [dispatch, trackEvent, createEventBuilder, ledgerModelName, navigation]);

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
      if (!option) return;
      setSelectedOption(option);
      await setHDPath(path);
    },
    [ledgerPathOptions],
  );

  return ledgerError || accounts.length <= 0 ? (
    <LedgerConnect
      onConnectLedger={onConnectHardware}
      selectedDevice={selectedDevice}
      setSelectedDevice={setSelectedDevice}
      ledgerLogicToRun={ledgerLogicToRun}
      isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
      isSendingLedgerCommands={isSendingLedgerCommands}
      ledgerError={ledgerError}
    />
  ) : (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={ledgerThemedImage}
            resizeMode="contain"
            style={styles.ledgerIcon}
          />

          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.navbarRightButton}
          >
            <MaterialIcon name="close" size={15} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        <View style-={styles.selectorContainer}>
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
              onValueChange={async (val) => await onSelectedPathChanged(val)}
              selectedValue={selectedOption.value}
            />
          </View>
        </View>
        <AccountSelector
          accounts={accounts}
          selectedAccounts={existingAccounts}
          nextPage={nextPage}
          prevPage={prevPage}
          onUnlock={(accountIndex: number[]) => {
            setErrorMsg(null);
            setUnlockAccounts({ trigger: true, accountIndexes: accountIndex });
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
        isLoadingAction
        onAnimationCompleted={onAnimationCompleted}
      >
        <Text style={styles.text}>{strings('common.please_wait')}</Text>
      </BlockingActionModal>
    </>
  );
};

export default LedgerSelectAccount;
