import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Engine from '../../../core/Engine';
import AnimatedQRScannerModal from '../../UI/QRHardware/AnimatedQRScanner';
import SelectQRAccounts from './SelectQRAccounts';
import ConnectQRInstruction from './Instruction';
import Icon from 'react-native-vector-icons/FontAwesome';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';
import { IAccount } from './types';
import { UR } from '@ngraveio/bc-ur';
import Alert, { AlertType } from '../../Base/Alert';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { fontStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { safeToChecksumAddress } from '../../../util/address';

interface IConnectQRHardwareProps {
  navigation: any;
}
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
    },
    header: {
      marginTop: Device.isIphoneX() ? 50 : 20,
      flexDirection: 'row',
      width: '100%',
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    navbarRightButton: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      height: 48,
      width: 48,
      flex: 1,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
    qrcode: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    error: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.red,
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
  });

const ConnectQRHardware = ({ navigation }: IConnectQRHardwareProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const KeyringController = useMemo(() => {
    const { KeyringController: keyring } = Engine.context as any;
    return keyring;
  }, []);

  const AccountTrackerController = useMemo(
    () => (Engine.context as any).AccountTrackerController,
    [],
  );

  const [QRState, setQRState] = useState({
    sync: {
      reading: false,
    },
  });
  const [scannerVisible, setScannerVisible] = useState(false);
  const [blockingModalVisible, setBlockingModalVisible] = useState(false);
  const [accounts, setAccounts] = useState<
    { address: string; index: number; balance: string }[]
  >([]);
  const [trackedAccounts, setTrackedAccounts] = useState<{
    [p: string]: { balance: string };
  }>({});
  const [checkedAccounts, setCheckedAccounts] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resetError = useCallback(() => {
    setErrorMsg('');
  }, []);

  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);

  const showScanner = useCallback(() => {
    setScannerVisible(true);
  }, []);

  const hideScanner = useCallback(() => {
    setScannerVisible(false);
  }, []);

  useEffect(() => {
    KeyringController.getAccounts().then((value: string[]) => {
      setExistingAccounts(value);
    });
  }, [KeyringController]);

  const subscribeKeyringState = useCallback((storeValue: any) => {
    setQRState(storeValue);
  }, []);

  useEffect(() => {
    let memStore: any;
    KeyringController.getQRKeyringState().then((_memStore: any) => {
      memStore = _memStore;
      memStore.subscribe(subscribeKeyringState);
    });
    return () => {
      if (memStore) {
        memStore.unsubscribe(subscribeKeyringState);
      }
    };
  }, [KeyringController, subscribeKeyringState]);

  useEffect(() => {
    const unTrackedAccounts: string[] = [];
    accounts.forEach((account) => {
      if (!trackedAccounts[account.address]) {
        unTrackedAccounts.push(account.address);
      }
    });
    if (unTrackedAccounts.length > 0) {
      AccountTrackerController.syncBalanceWithAddresses(unTrackedAccounts).then(
        (_trackedAccounts: any) => {
          setTrackedAccounts(
            Object.assign({}, trackedAccounts, _trackedAccounts),
          );
        },
      );
    }
  }, [AccountTrackerController, accounts, trackedAccounts]);

  useEffect(() => {
    if (QRState.sync.reading) {
      showScanner();
    } else {
      hideScanner();
    }
  }, [QRState.sync, hideScanner, showScanner]);

  const onConnectHardware = useCallback(async () => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.CONTINUE_QR_HARDWARE_WALLET, {
      device_type: 'QR Hardware',
    });
    resetError();
    const _accounts = await KeyringController.connectQRHardware(0);
    setAccounts(_accounts);
  }, [KeyringController, resetError]);

  const onScanSuccess = useCallback(
    (ur: UR) => {
      hideScanner();
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.CONNECT_HARDWARE_WALLET_SUCCESS,
        {
          device_type: 'QR Hardware',
        },
      );
      if (ur.type === SUPPORTED_UR_TYPE.CRYPTO_HDKEY) {
        KeyringController.submitQRCryptoHDKey(ur.cbor.toString('hex'));
      } else {
        KeyringController.submitQRCryptoAccount(ur.cbor.toString('hex'));
      }
      resetError();
    },
    [KeyringController, hideScanner, resetError],
  );

  const onScanError = useCallback(
    async (error: string) => {
      hideScanner();
      setErrorMsg(error);
      const qrKeyring = await KeyringController.getOrAddQRKeyring();
      qrKeyring.cancelSync();
    },
    [hideScanner, KeyringController],
  );

  const nextPage = useCallback(async () => {
    resetError();
    const _accounts = await KeyringController.connectQRHardware(1);
    setAccounts(_accounts);
  }, [KeyringController, resetError]);

  const prevPage = useCallback(async () => {
    resetError();
    const _accounts = await KeyringController.connectQRHardware(-1);
    setAccounts(_accounts);
  }, [KeyringController, resetError]);

  const onToggle = useCallback(
    (index: number) => {
      resetError();
      if (!checkedAccounts.includes(index)) {
        setCheckedAccounts([...checkedAccounts, index]);
      } else {
        setCheckedAccounts(checkedAccounts.filter((i) => i !== index));
      }
    },
    [checkedAccounts, resetError],
  );

  const enhancedAccounts: IAccount[] = useMemo(
    () =>
      accounts.map((account) => {
        let checked = false;
        let exist = false;
        if (checkedAccounts.includes(account.index)) checked = true;
        if (
          existingAccounts.find(
            (item) => item.toLowerCase() === account.address.toLowerCase(),
          )
        ) {
          exist = true;
          checked = true;
        }
        return {
          ...account,
          checked,
          exist,
          balance: trackedAccounts[account.address]?.balance || '0x0',
        };
      }),
    [accounts, checkedAccounts, existingAccounts, trackedAccounts],
  );

  const onUnlock = useCallback(async () => {
    const { PreferencesController } = Engine.context as any;
    resetError();
    setBlockingModalVisible(true);
    const importedAccountAddresses = [];
    try {
      for (const account of checkedAccounts) {
        const accountAddress =
          await KeyringController.unlockQRHardwareWalletAccount(account);
        importedAccountAddresses.push(accountAddress);
      }
      PreferencesController.setSelectedAddress(importedAccountAddresses[0]);
    } catch (err) {
      Logger.log('Error: Connecting QR hardware wallet', err);
    }
    setBlockingModalVisible(false);
    navigation.goBack();
  }, [KeyringController, checkedAccounts, navigation, resetError]);

  const onForget = useCallback(async () => {
    const { PreferencesController } = Engine.context as any;
    resetError();
    // removedAccounts and remainingAccounts are not checksummed here.
    const { removedAccounts, remainingAccounts } =
      await KeyringController.forgetQRDevice();
    PreferencesController.setSelectedAddress(
      remainingAccounts[remainingAccounts.length - 1],
    );
    const checksummedRemovedAccounts = removedAccounts.map(
      safeToChecksumAddress,
    );
    removeAccountsFromPermissions(checksummedRemovedAccounts);
    navigation.goBack();
  }, [KeyringController, navigation, resetError]);

  const renderAlert = () =>
    errorMsg !== '' && (
      <Alert type={AlertType.Error} onPress={resetError}>
        <Text style={styles.error}>{errorMsg}</Text>
      </Alert>
    );

  return (
    <Fragment>
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon
            name="qrcode"
            size={42}
            style={styles.qrcode}
            color={colors.text.default}
          />
          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.navbarRightButton}
          >
            <MaterialIcon name="close" size={15} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        {accounts.length <= 0 ? (
          <ConnectQRInstruction
            onConnect={onConnectHardware}
            renderAlert={renderAlert}
            navigation={navigation}
          />
        ) : (
          <SelectQRAccounts
            canUnlock={checkedAccounts.length > 0}
            accounts={enhancedAccounts}
            nextPage={nextPage}
            prevPage={prevPage}
            toggleAccount={onToggle}
            onUnlock={onUnlock}
            onForget={onForget}
          />
        )}
      </View>
      <AnimatedQRScannerModal
        visible={scannerVisible}
        purpose={'sync'}
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        hideModal={hideScanner}
      />
      <BlockingActionModal modalVisible={blockingModalVisible} isLoadingAction>
        <Text style={styles.text}>
          {strings('connect_qr_hardware.please_wait')}
        </Text>
      </BlockingActionModal>
    </Fragment>
  );
};

export default ConnectQRHardware;
