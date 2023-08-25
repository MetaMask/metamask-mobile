/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../util/theme';
import Engine from '../../../core/Engine';
import Text from '../../Base/Text';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../constants/network';
import { getEtherscanAddressUrl } from '../../../util/etherscan';
import { findBlockExplorerForRpc } from '../../../util/networks';
import { useSelector } from 'react-redux';
import AccountDetails from '../ConnectHardware/ConnectQRHardware/AccountDetails';

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

const ledgerDeviceDarkImage = require('../../../images/ledger-device-dark.png');
const ledgerDeviceLightImage = require('../../../images/ledger-device-light.png');

const LedgerAccountInfo = () => {
  const navigation = useNavigation();
  const [account, setAccount] = useState('');
  const [accountBalance, setAccountBalance] = useState<string>('0');
  const { colors } = useAppThemeFromContext() ?? mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ledgerThemedImage = useAssetFromTheme(
    ledgerDeviceLightImage,
    ledgerDeviceDarkImage,
  );
  const { KeyringController, AccountTrackerController } = Engine.context as any;
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
      const ledgerKeyring = await KeyringController.getLedgerKeyring();
      const accounts = await ledgerKeyring.getAccounts();

      setAccount(accounts[0]);
    };

    getAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onForgetDevice = async () => {
    await KeyringController.forgetLedger();
    navigation.goBack();
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
      const { type, rpcTarget } = provider;
      let accountLink: string;

      if (type === RPC) {
        const blockExplorer =
          findBlockExplorerForRpc(rpcTarget, frequentRpcList) ||
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
          ticker={provider.ticker || 'ETH'}
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
