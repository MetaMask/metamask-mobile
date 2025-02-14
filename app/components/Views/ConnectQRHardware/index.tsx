import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import type { MetaMaskKeyring as QRKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { KeyringTypes } from '@metamask/keyring-controller';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { ThemeColors } from '@metamask/design-tokens';
import PAGINATION_OPERATIONS from '../../../constants/pagination';

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

/**
 * Initiate a QR hardware wallet connection
 *
 * This returns a tuple containing a set of QR interactions, followed by a Promise representing
 * the QR connection process overall.
 *
 * The QR interactions are returned here to ensure that we get the correct references for the
 * specific keyring instance we initiated the scan with. This is to ensure that we always resolve
 * the `connectQRHardware` Promise. There are equivalent methods on the `KeyringController` class
 * that we could use (e.g. `KeyringController.cancelQRSynchronization` would call
 * `keyring.cancelSync` for us), but these methods are unsafe to use because they might end up
 * calling the method on the wrong keyring instance (e.g. if the user had locked and unlocked the
 * app since initiating the scan). They will be deprecated in a future `KeyringController` version.
 *
 * TODO: Refactor the QR Keyring to separate interaction methods from keyring operations, so that
 * interactions are not affected by our keyring operation locks and by our lock/unlock operations.
 *
 * @param page - The page of accounts to request (either 0, 1, or -1), for "first page",
 * "next page", and "previous page" respectively.
 * @returns A tuple of QR keyring interactions, and a Promise representing the QR hardware wallet
 * connection process.
 */
async function initiateQRHardwareConnection(
  page: 0 | 1 | -1,
): Promise<
  [
    Pick<QRKeyring, 'cancelSync' | 'submitCryptoAccount' | 'submitCryptoHDKey'>,
    ReturnType<
      (typeof Engine)['context']['KeyringController']['connectQRHardware']
    >,
  ]
> {
  const KeyringController = Engine.context.KeyringController;

  const qrInteractions = await KeyringController.withKeyring(
    { type: KeyringTypes.qr },
    // @ts-expect-error The QR Keyring type is not compatible with our keyring type yet
    async (keyring: QRKeyring) => ({
      cancelSync: keyring.cancelSync.bind(keyring),
      submitCryptoAccount: keyring.submitCryptoAccount.bind(keyring),
      submitCryptoHDKey: keyring.submitCryptoHDKey.bind(keyring),
    }),
    { createIfMissing: true },
  );

  const connectQRHardwarePromise = KeyringController.connectQRHardware(page);

  return [qrInteractions, connectQRHardwarePromise];
}

const ConnectQRHardware = ({ navigation }: IConnectQRHardwareProps) => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);

  const KeyringController = useMemo(() => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { KeyringController: keyring } = Engine.context as any;
    return keyring;
  }, []);

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

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscribeKeyringState = useCallback((storeValue: any) => {
    setQRState(storeValue);
  }, []);

  useEffect(() => {
    // This ensures that a QR keyring gets created if it doesn't already exist.
    // This is intentionally not awaited (the subscription still gets setup correctly if called
    // before the keyring is created).
    // TODO: Stop automatically creating keyrings
    Engine.context.KeyringController.getOrAddQRKeyring();
    Engine.controllerMessenger.subscribe(
      'KeyringController:qrKeyringStateChange',
      subscribeKeyringState,
    );
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'KeyringController:qrKeyringStateChange',
        subscribeKeyringState,
      );
    };
  }, [KeyringController, subscribeKeyringState]);

  useEffect(() => {
    if (QRState.sync.reading) {
      showScanner();
    } else {
      hideScanner();
    }
  }, [QRState.sync, hideScanner, showScanner]);

  const qrInteractionsRef =
    useRef<
      Pick<
        QRKeyring,
        'cancelSync' | 'submitCryptoAccount' | 'submitCryptoHDKey'
      >
    >();

  const onConnectHardware = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONTINUE_QR_HARDWARE_WALLET)
        .addProperties({
          device_type: HardwareDeviceTypes.QR,
        })
        .build(),
    );
    resetError();
    const [qrInteractions, connectQRHardwarePromise] =
      await initiateQRHardwareConnection(PAGINATION_OPERATIONS.GET_FIRST_PAGE);

    qrInteractionsRef.current = qrInteractions;
    const firstPageAccounts = await connectQRHardwarePromise;
    delete qrInteractionsRef.current;

    setAccounts(firstPageAccounts);
  }, [resetError, trackEvent, createEventBuilder]);

  const onScanSuccess = useCallback(
    (ur: UR) => {
      hideScanner();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET_SUCCESS)
          .addProperties({
            device_type: HardwareDeviceTypes.QR,
          })
          .build(),
      );
      if (!qrInteractionsRef.current) {
        const errorMessage = 'Missing QR keyring interactions';
        setErrorMsg(errorMessage);
        throw new Error(errorMessage);
      }
      if (ur.type === SUPPORTED_UR_TYPE.CRYPTO_HDKEY) {
        qrInteractionsRef.current.submitCryptoHDKey(ur.cbor.toString('hex'));
      } else {
        qrInteractionsRef.current.submitCryptoAccount(ur.cbor.toString('hex'));
      }
      resetError();
    },
    [hideScanner, resetError, trackEvent, createEventBuilder],
  );

  const onScanError = useCallback(
    async (error: string) => {
      hideScanner();
      setErrorMsg(error);
      if (qrInteractionsRef.current) {
        qrInteractionsRef.current.cancelSync();
      }
    },
    [hideScanner],
  );

  const nextPage = useCallback(async () => {
    resetError();
    const [qrInteractions, connectQRHardwarePromise] =
      await initiateQRHardwareConnection(PAGINATION_OPERATIONS.GET_NEXT_PAGE);

    qrInteractionsRef.current = qrInteractions;
    const nextPageAccounts = await connectQRHardwarePromise;
    delete qrInteractionsRef.current;

    setAccounts(nextPageAccounts);
  }, [resetError]);

  const prevPage = useCallback(async () => {
    resetError();
    const [qrInteractions, connectQRHardwarePromise] =
      await initiateQRHardwareConnection(
        PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
      );

    qrInteractionsRef.current = qrInteractions;
    const previousPageAccounts = await connectQRHardwarePromise;
    delete qrInteractionsRef.current;

    setAccounts(previousPageAccounts);
  }, [resetError]);

  const onCheck = useCallback(() => {
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
    const checksummedRemovedAccounts = removedAccounts.map(
      safeToChecksumAddress,
    );
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
        visible={scannerVisible}
        purpose={'sync'}
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        hideModal={hideScanner}
      />
      <BlockingActionModal modalVisible={blockingModalVisible} isLoadingAction>
        <Text style={styles.text}>{strings('common.please_wait')}</Text>
      </BlockingActionModal>
    </Fragment>
  );
};

export default ConnectQRHardware;
