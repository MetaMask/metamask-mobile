/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
import { StackActions, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { setReloadAccounts } from '../../../actions/accounts';
import { NO_RPC_BLOCK_EXPLORER, RPC } from '../../../constants/network';
import Engine from '../../../core/Engine';
import { forgetLedger, withLedgerKeyring } from '../../../core/Ledger/Ledger';
import Device from '../../../util/device';
import { getEtherscanAddressUrl } from '../../../util/etherscan';
import { findBlockExplorerForRpc } from '../../../util/networks';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../util/theme';
import Text from '../../Base/Text';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import AccountDetails from '../../../components/UI/HardwareWallet/AccountDetails';

import ledgerDeviceDarkImage from '../../../images/ledger-device-dark.png';
import ledgerDeviceLightImage from '../../../images/ledger-device-light.png';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import type LedgerKeyring from '@consensys/ledgerhq-metamask-keyring';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    imageWrapper: {
      alignSelf: 'flex-start',
      marginLeft: Device.getDeviceWidth() * 0.07,
    },
    textWrapper: {
      alignItems: 'center',
      marginHorizontal: Device.getDeviceWidth() * 0.07,
    },
    accountCountText: {
      fontSize: 24,
    },
    accountsContainer: {
      flexDirection: 'row',
      marginTop: 20,
      marginLeft: Device.getDeviceWidth() * 0.02,
      marginRight: Device.getDeviceWidth() * 0.07,
    },
    textContainer: {
      flex: 0.7,
    },
    etherscanContainer: {
      flex: 0.3,
      justifyContent: 'center',
    },
    etherscanImage: {
      width: 30,
      height: 30,
    },
    forgetLedgerContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: 20,
    },
  });

const LedgerAccountInfo = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { trackEvent } = useMetrics();
  const [account, setAccount] = useState('');
  const [accountBalance, setAccountBalance] = useState<string>('0');
  const { colors } = useAppThemeFromContext() ?? mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ledgerThemedImage = useAssetFromTheme(
    ledgerDeviceLightImage,
    ledgerDeviceDarkImage,
  );
  const { AccountTrackerController } = Engine.context as any;
  const provider = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.providerConfig,
  );
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle('', navigation, true, colors),
    );
  }, [navigation, colors]);

  useEffect(() => {
    const getAccount = async () => {
      const accounts = await withLedgerKeyring(async (keyring: LedgerKeyring) =>
        keyring.getAccounts(),
      );

      setAccount(accounts[0]);
    };

    getAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onForgetDevice = async () => {
    await forgetLedger();
    dispatch(setReloadAccounts(true));
    trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_WALLET_FORGOTTEN, {
      device_type: 'Ledger',
    });
    navigation.dispatch(StackActions.pop(2));
  };

  const getEthAmountForAccount = async (ledgerAccount: string) => {
    if (ledgerAccount) {
      const ethValue = await AccountTrackerController.syncBalanceWithAddresses([
        ledgerAccount,
      ]);

      setAccountBalance(ethValue[ledgerAccount]?.balance);
    }
  };

  useEffect(() => {
    if (account) {
      getEthAmountForAccount(account);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const toBlockExplorer = useCallback(
    (address: string) => {
      const { type, rpcUrl } = provider;
      let accountLink: string;

      if (type === RPC) {
        const blockExplorer =
          findBlockExplorerForRpc(rpcUrl, frequentRpcList) ||
          NO_RPC_BLOCK_EXPLORER;
        accountLink = `${blockExplorer}/address/${address}`;
      } else {
        accountLink = getEtherscanAddressUrl(type, address);
      }

      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: accountLink,
        },
      });
    },
    [frequentRpcList, navigation, provider],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image source={ledgerThemedImage} resizeMode="contain" />
      </View>
      <View style={styles.textWrapper}>
        <Text big style={styles.accountCountText}>
          {strings('ledger.ledger_account_count')}
        </Text>
      </View>
      <View style={styles.accountsContainer}>
        <AccountDetails
          index={1}
          address={account}
          balance={accountBalance}
          ticker={provider.ticker}
          toBlockExplorer={toBlockExplorer}
        />
      </View>
      <View style={styles.forgetLedgerContainer}>
        <TouchableOpacity onPress={onForgetDevice}>
          <Text blue>{strings('ledger.forget_device')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default React.memo(LedgerAccountInfo);
