import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Engine from '../../../core/Engine';
import AccountSelector from '../../UI/HardwareWallet/AccountSelector';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { useAssetFromTheme, useTheme } from '../../../util/theme';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import ledgerDeviceLightImage from 'images/ledger-device-light.png';
import ledgerDeviceDarkImage from 'images/ledger-device-dark.png';
import {
  forgetLedger,
  getLedgerAccountsByPage,
} from '../../../core/Ledger/Ledger';
import LedgerConnect from '../LedgerConnect';
import { setReloadAccounts } from '../../../actions/accounts';
import { StackActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Colors } from '../../../util/theme/models';
import { KeyringController } from '@metamask/keyring-controller';
import { StackNavigationProp } from '@react-navigation/stack';

interface ILedgerSelectAccountProps {
  navigation: StackNavigationProp<never>;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
    },
    ledgerIcon: {
      width: 60,
      height: 60,
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
    error: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.error,
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
  });

const LedgerSelectAccount = ({ navigation }: ILedgerSelectAccountProps) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const styles = createStyles(colors);
  const ledgerThemedImage = useAssetFromTheme(
    ledgerDeviceLightImage,
    ledgerDeviceDarkImage,
  );

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

  useEffect(() => {
    keyringController.getAccounts().then((value: string[]) => {
      setExistingAccounts(value);
    });
  }, [keyringController]);

  const onConnectHardware = useCallback(async () => {
    trackEvent(MetaMetricsEvents.CONTINUE_LEDGER_HARDWARE_WALLET, {
      device_type: 'Ledger',
    });
    const _accounts = await getLedgerAccountsByPage(0);
    setAccounts(_accounts);
  }, [trackEvent]);

  const nextPage = useCallback(async () => {
    const _accounts = await getLedgerAccountsByPage(1);
    setAccounts(_accounts);
  }, []);

  const prevPage = useCallback(async () => {
    const _accounts = await getLedgerAccountsByPage(-1);
    setAccounts(_accounts);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onToggle = useCallback(() => {}, []);

  const onUnlock = useCallback(
    async (accountIndexes: number[]) => {
      setBlockingModalVisible(true);

      try {
        for (const index of accountIndexes) {
          await keyringController.unlockLedgerWalletAccount(index);
        }
      } catch (err) {
        Logger.log('Error: Connecting QR hardware wallet', err);
      }
      setBlockingModalVisible(false);

      trackEvent(MetaMetricsEvents.CONNECT_LEDGER_SUCCESS, {
        device_type: 'Ledger',
        //TODO Do we need to add address here?
      });
      navigation.pop(2);
    },
    [keyringController, navigation, trackEvent],
  );

  const onForget = useCallback(async () => {
    setBlockingModalVisible(true);
    await forgetLedger();
    dispatch(setReloadAccounts(true));
    trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_WALLET_FORGOTTEN, {
      device_type: 'Ledger',
    });
    setBlockingModalVisible(false);
    navigation.dispatch(StackActions.pop(2));
  }, [dispatch, navigation, trackEvent]);

  const onAnimationCompleted = useCallback(async () => {
    if (blockingModalVisible) {
      if (forgetDevice) {
        await onForget();
        setBlockingModalVisible(false);
        setForgetDevice(false);
      } else if (unlockAccounts.trigger) {
        await onUnlock(unlockAccounts.accountIndexes);
        setBlockingModalVisible(false);
        setUnlockAccounts({ trigger: false, accountIndexes: [] });
      }
    }
  }, [
    blockingModalVisible,
    forgetDevice,
    onForget,
    onUnlock,
    unlockAccounts.accountIndexes,
    unlockAccounts.trigger,
  ]);

  return accounts.length <= 0 ? (
    <LedgerConnect onConnectLedger={onConnectHardware} />
  ) : (
    <Fragment>
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
          />
        </View>
        <AccountSelector
          accounts={accounts}
          selectedAccounts={existingAccounts}
          nextPage={nextPage}
          prevPage={prevPage}
          toggleAccount={onToggle}
          onUnlock={(accountIndex: number[]) => {
            setUnlockAccounts({ trigger: true, accountIndexes: accountIndex });
            setBlockingModalVisible(true);
          }}
          onForget={() => {
            setForgetDevice(true);
            setBlockingModalVisible(true);
          }}
          title={strings('connect_qr_hardware.select_accounts')}
        />
      </View>
      <BlockingActionModal
        modalVisible={blockingModalVisible}
        isLoadingAction
        onAnimationCompleted={onAnimationCompleted}
      >
        <Text style={styles.text}>
          {strings('connect_qr_hardware.please_wait')}
        </Text>
      </BlockingActionModal>
    </Fragment>
  );
};

export default LedgerSelectAccount;
