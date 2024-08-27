import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Engine from '../../../core/Engine';
import AccountSelector from '../../UI/HardwareWallet/AccountSelector';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAssetFromTheme, useTheme } from '../../../util/theme';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import ledgerDeviceLightImage from 'images/ledger-device-light.png';
import ledgerDeviceDarkImage from 'images/ledger-device-dark.png';
import {
  forgetLedger,
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
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import SelectComponent from '../../UI/SelectComponent';
import {
  LEDGER_BIP44_PATH,
  LEDGER_LEGACY_PATH,
  LEDGER_LIVE_PATH,
} from '../../../core/Ledger/constants';

interface OptionType {
  key: string;
  label: string;
  value: string;
}

const LedgerSelectAccount = () => {
  const navigation = useNavigation<StackNavigationProp<never>>();
  const [selectedDevice, setSelectedDevice] = useState<LedgerDevice>(null);
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const styles = createStyles(colors);
  const ledgerThemedImage = useAssetFromTheme(
    ledgerDeviceLightImage,
    ledgerDeviceDarkImage,
  );

  const options: OptionType[] = [
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
  ];

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

  const [selectOption, setSelectOption] = useState<OptionType>(options[0]);

  useEffect(() => {
    keyringController.getAccounts().then((value: string[]) => {
      setExistingAccounts(value);
    });
  }, [keyringController]);

  useEffect(() => {
    if (ledgerError) {
      setBlockingModalVisible(false);
    }
  }, [ledgerError]);

  const onConnectHardware = useCallback(async () => {
    trackEvent(MetaMetricsEvents.CONTINUE_LEDGER_HARDWARE_WALLET, {
      device_type: HardwareDeviceTypes.LEDGER,
    });
    const _accounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_FIRST_PAGE,
    );
    setAccounts(_accounts);
  }, [trackEvent]);

  useEffect(() => {
    if (selectOption) {
      setBlockingModalVisible(true);
      getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE)
        .then((_accounts) => {
          setAccounts(_accounts);
          setBlockingModalVisible(false);
        })
        .catch((e) => {
          console.error(e);
          setBlockingModalVisible(false);
        });
    }
  }, [selectOption]);

  const nextPage = useCallback(async () => {
    setBlockingModalVisible(true);
    const _accounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_NEXT_PAGE,
    );
    setAccounts(_accounts);
    setBlockingModalVisible(false);
  }, []);

  const prevPage = useCallback(async () => {
    setBlockingModalVisible(true);
    const _accounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
    );
    setAccounts(_accounts);
    setBlockingModalVisible(false);
  }, []);

  const onUnlock = useCallback(
    async (accountIndexes: number[]) => {
      setBlockingModalVisible(true);

      try {
        for (const index of accountIndexes) {
          await unlockLedgerWalletAccount(index);
        }
      } catch (err) {
        // Do nothing
      }
      setBlockingModalVisible(false);

      trackEvent(MetaMetricsEvents.CONNECT_LEDGER_SUCCESS, {
        device_type: HardwareDeviceTypes.LEDGER,
      });
      navigation.pop(2);
    },
    [navigation, trackEvent],
  );

  const onForget = useCallback(async () => {
    setBlockingModalVisible(true);
    await forgetLedger();
    dispatch(setReloadAccounts(true));
    trackEvent(MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN, {
      device_type: HardwareDeviceTypes.LEDGER,
    });
    setBlockingModalVisible(false);
    navigation.dispatch(StackActions.pop(2));
  }, [dispatch, navigation, trackEvent]);

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
          <Text style={styles.mainTitle}>
            {strings('ledger.select_accounts')}{' '}
          </Text>
          <Text style={styles.selectorTitle}>
            {strings('ledger.select_hd_path')}
          </Text>
          <Text style={styles.selectorDescription}>
            {strings('ledger.select_hd_path_description')}
          </Text>
          <View style={styles.pathSelector}>
            <SelectComponent
              options={options}
              label={strings('ledger.select_hd_path')}
              onValueChange={async (path: string) => {
                const option = options.find((d) => d.key === path);
                if (!option) return;
                setSelectOption(option);
                await setHDPath(path);
              }}
              selectedValue={selectOption.value}
            />
          </View>
        </View>
        <AccountSelector
          accounts={accounts}
          selectedAccounts={existingAccounts}
          nextPage={nextPage}
          prevPage={prevPage}
          onUnlock={(accountIndex: number[]) => {
            setUnlockAccounts({ trigger: true, accountIndexes: accountIndex });
            setBlockingModalVisible(true);
          }}
          onForget={() => {
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
