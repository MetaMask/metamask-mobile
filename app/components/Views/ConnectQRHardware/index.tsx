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
import AccountSelector from '../../UI/HardwareWallet/AccountSelector';
import ConnectQRInstruction from './Instruction';
import Icon from 'react-native-vector-icons/FontAwesome';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';
import { UR } from '@ngraveio/bc-ur';
import Alert, { AlertType } from '../../Base/Alert';
import { MetaMetricsEvents } from '../../../core/Analytics';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';
import { fontStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { useMetrics } from '../../../components/hooks/useMetrics';
import ExtendedKeyringTypes, {
  HardwareDeviceTypes,
} from '../../../constants/keyringTypes';
import { ThemeColors } from '@metamask/design-tokens';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { withQrKeyring } from 'app/core/QrKeyring/QrKeyring';
import { getChecksumAddress } from '@metamask/utils';

interface IConnectQRHardwareProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

const createStyles = (colors: ThemeColors) =>
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
      color: colors.error.default,
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
  });

const ConnectQRHardware = ({ navigation }: IConnectQRHardwareProps) => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);

  const [isScanning, setIsScanning] = useState(false);

  const KeyringController = useMemo(() => Engine.context.KeyringController, []);

  const [blockingModalVisible, setBlockingModalVisible] = useState(false);
  const [accounts, setAccounts] = useState<
    { address: string; index: number; balance: string }[]
  >([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resetError = useCallback(() => {
    setErrorMsg('');
  }, []);

  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);

  useEffect(() => {
    KeyringController.getAccounts().then((value: string[]) => {
      setExistingAccounts(value);
    });
  }, [KeyringController]);

  const onConnectHardware = async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONTINUE_QR_HARDWARE_WALLET)
        .addProperties({
          device_type: HardwareDeviceTypes.QR,
        })
        .build(),
    );
    resetError();
    try {
      setIsScanning(true);
      const firstAccountsPage = await withQrKeyring(({ keyring }) =>
        keyring.getFirstPage(),
      );
      setAccounts(
        // TODO: Add `balance` to the QR Keyring accounts or remove it from the expected type
        firstAccountsPage.map((account) => ({ ...account, balance: '0x0' })),
      );
    } finally {
      setIsScanning(false);
    }
  };

  const onScanSuccess = useCallback(
    async (ur: UR) => {
      setIsScanning(false);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET_SUCCESS)
          .addProperties({
            device_type: HardwareDeviceTypes.QR,
          })
          .build(),
      );
      Engine.resolveQrKeyringScanRequest({
        type: ur.type,
        cbor: ur.cbor.toString('hex'),
      });
      resetError();
    },
    [resetError, trackEvent, createEventBuilder],
  );

  const onScanError = useCallback(async (error: string) => {
    setErrorMsg(error);
    Engine.rejectQrKeyringScanRequest(new Error(error));
  }, []);

  const cancelScan = useCallback(() => {
    Engine.rejectQrKeyringScanRequest(new Error('Scan cancelled'));
  }, []);

  const nextPage = useCallback(async () => {
    resetError();
    const nextAccountsPage = await withQrKeyring(async ({ keyring }) =>
      keyring.getNextPage(),
    );
    setAccounts(
      // TODO: Add `balance` to the QR Keyring accounts or remove it from the expected type
      nextAccountsPage.map((account) => ({ ...account, balance: '0x0' })),
    );
  }, [resetError]);

  const prevPage = useCallback(async () => {
    resetError();
    const previousAccountsPage = await withQrKeyring(async ({ keyring }) =>
      keyring.getPreviousPage(),
    );
    setAccounts(
      // TODO: Add `balance` to the QR Keyring accounts or remove it from the expected type
      previousAccountsPage.map((account) => ({
        ...account,
        balance: '0x0',
      })),
    );
  }, [resetError]);

  const onCheck = useCallback(() => {
    resetError();
  }, [resetError]);

  const onUnlock = useCallback(
    async (accountIndexs: number[]) => {
      resetError();
      setBlockingModalVisible(true);
      try {
        await withQrKeyring(async ({ keyring }) => {
          for (const index of accountIndexs) {
            keyring.setAccountToUnlock(index);
            await keyring.addAccounts(1);
          }
        });
      } catch (err) {
        Logger.log('Error: Connecting QR hardware wallet', err);
      }
      setBlockingModalVisible(false);
      navigation.pop(2);
    },
    [navigation, resetError],
  );

  const onForget = useCallback(async () => {
    resetError();
    const remainingAccounts = KeyringController.state.keyrings
      .filter((keyring) => keyring.type !== ExtendedKeyringTypes.qr)
      .flatMap((keyring) => keyring.accounts);
    Engine.setSelectedAddress(remainingAccounts[remainingAccounts.length - 1]);
    const removedAccounts = await withQrKeyring(async ({ keyring }) => {
      const existingQrAccounts = await keyring.getAccounts();
      await keyring.forgetDevice();
      return existingQrAccounts;
    });
    const checksummedRemovedAccounts = removedAccounts.map(getChecksumAddress);
    removeAccountsFromPermissions(checksummedRemovedAccounts);
    navigation.pop(2);
  }, [KeyringController, navigation, resetError]);

  const renderAlert = () =>
    errorMsg !== '' ? (
      <Alert type={AlertType.Error} onPress={resetError}>
        <Text style={styles.error}>{errorMsg}</Text>
      </Alert>
    ) : (
      <></>
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
          <AccountSelector
            accounts={accounts}
            selectedAccounts={existingAccounts}
            nextPage={nextPage}
            prevPage={prevPage}
            onCheck={onCheck}
            onUnlock={onUnlock}
            onForget={onForget}
            title={strings('connect_qr_hardware.select_accounts')}
          />
        )}
      </View>
      <AnimatedQRScannerModal
        visible={isScanning}
        purpose={QrScanRequestType.PAIR}
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        hideModal={cancelScan}
      />
      <BlockingActionModal modalVisible={blockingModalVisible} isLoadingAction>
        <Text style={styles.text}>{strings('common.please_wait')}</Text>
      </BlockingActionModal>
    </Fragment>
  );
};

export default ConnectQRHardware;
