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
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { fontStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { safeToChecksumAddress } from '../../../util/address';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { KeyringTypes } from '@metamask/keyring-controller';
import type { MetaMaskKeyring as QRKeyring } from '@keystonehq/metamask-airgapped-keyring';

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
  const { trackEvent } = useMetrics();
  const styles = createStyles(colors);

  const KeyringController = useMemo(() => Engine.context.KeyringController, []);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [blockingModalVisible, setBlockingModalVisible] = useState(false);
  const [accounts, setAccounts] = useState<
    { address: string; index: number; balance: string }[]
  >([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resetError = useCallback(() => {
    setErrorMsg('');
  }, []);

  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);

  const connectFirstPage = useCallback(async () => {
    await KeyringController.withKeyring(
      { type: KeyringTypes.qr },
      // @ts-expect-error QRKeyring is not yet compatible with EthKeyring type
      async (keyring: QRKeyring) => {
        if ((await keyring.serialize()).initialized) {
          // the first page of accounts is obtained only if
          // the keyring is already initialized (e.g. there is already an HDKey)
          setAccounts(await keyring.getFirstPage());
        }
      },
      { createIfMissing: true },
    );
  }, [KeyringController]);

  useEffect(() => {
    // in case there is a QR keyring already connected, this will
    // show the first page of accounts once the view is loaded
    connectFirstPage();
  }, [connectFirstPage]);

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

  const onConnectHardware = useCallback(async () => {
    trackEvent(MetaMetricsEvents.CONTINUE_QR_HARDWARE_WALLET, {
      device_type: 'QR Hardware',
    });
    resetError();
    showScanner();
  }, [resetError, trackEvent, showScanner]);

  const onScanSuccess = useCallback(
    async (ur: UR) => {
      hideScanner();
      trackEvent(MetaMetricsEvents.CONNECT_HARDWARE_WALLET_SUCCESS, {
        device_type: 'QR Hardware',
      });
      setAccounts(
        await KeyringController.withKeyring(
          { type: KeyringTypes.qr },
          // @ts-expect-error QRKeyring is not yet compatible with EthKeyring type
          async (keyring: QRKeyring) => {
            // this promise is left pending until a CBOR is submitted
            const firstPagePromise = keyring.getFirstPage();
            if (ur.type === SUPPORTED_UR_TYPE.CRYPTO_HDKEY) {
              keyring.submitCryptoHDKey(ur.cbor.toString('hex'));
            } else {
              keyring.submitCryptoAccount(ur.cbor.toString('hex'));
            }
            return await firstPagePromise;
          },
          { createIfMissing: true },
        ),
      );
      resetError();
    },
    [KeyringController, hideScanner, resetError, trackEvent],
  );

  const onScanError = useCallback(
    async (error: string) => {
      hideScanner();
      setErrorMsg(error);
      await KeyringController.withKeyring(
        { type: KeyringTypes.qr },
        // @ts-expect-error QRKeyring is not yet compatible with EthKeyring type
        async (keyring: QRKeyring) => {
          keyring.cancelSync();
        },
        { createIfMissing: true },
      );
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

  const onToggle = useCallback(() => {
    resetError();
  }, [resetError]);

  const onUnlock = useCallback(
    async (accountIndexs: number[]) => {
      resetError();
      setBlockingModalVisible(true);
      try {
        for (const index of accountIndexs) {
          await KeyringController.unlockQRHardwareWalletAccount(index);
        }
      } catch (err) {
        Logger.log('Error: Connecting QR hardware wallet', err);
      }
      setBlockingModalVisible(false);
      navigation.pop(2);
    },
    [KeyringController, navigation, resetError],
  );

  const onForget = useCallback(async () => {
    resetError();
    // removedAccounts and remainingAccounts are not checksummed here.
    const { removedAccounts, remainingAccounts } =
      await KeyringController.forgetQRDevice();
    Engine.setSelectedAddress(remainingAccounts[remainingAccounts.length - 1]);
    const checksummedRemovedAccounts = removedAccounts
      .map(safeToChecksumAddress)
      .filter((address) => address) as string[];
    removeAccountsFromPermissions(checksummedRemovedAccounts);
    navigation.pop(2);
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
          <AccountSelector
            accounts={accounts}
            selectedAccounts={existingAccounts}
            nextPage={nextPage}
            prevPage={prevPage}
            toggleAccount={onToggle}
            onUnlock={onUnlock}
            onForget={onForget}
            title={strings('connect_qr_hardware.select_accounts')}
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
