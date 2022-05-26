/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
import React, { useEffect, useMemo, useState } from 'react';
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
import { renderFromWei } from '../../../util/number';
import { formatAddress } from '../../../util/address';
import { getNavigationOptionsTitle } from '../../UI/Navbar';

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
      marginHorizontal: Device.getDeviceWidth() * 0.085,
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
const etherscanDarkImage = require('../../../images/etherscan-dark.png');
const etherscanLightImage = require('../../../images/etherscan-light.png');

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
  const etherscanThemedImage = useAssetFromTheme(
    etherscanLightImage,
    etherscanDarkImage,
  );
  const { KeyringController, AccountTrackerController, NetworkController } =
    Engine.context as any;
  const ticker = NetworkController.provider.ticker || '';

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

      const decimalETHValue = renderFromWei(
        ethValue[ledgerAccount]?.balance || 0,
      );
      setAccountBalance(decimalETHValue.toString());
    }
  };

  useEffect(() => {
    if (account) {
      getEthAmountForAccount(account);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const onEtherscanPress = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: `https://etherscan.io/address/${account}`,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image source={ledgerThemedImage} />
      </View>
      <View style={styles.textWrapper}>
        <Text big style={styles.accountCountText}>
          {strings('ledger.ledger_account_count')}
        </Text>
      </View>
      <View style={styles.accountsContainer}>
        <View style={styles.textContainer}>
          <Text big bold>
            1
          </Text>
          <Text grey>{formatAddress(account, 'short')}</Text>
          <Text>{`${accountBalance} ${ticker.toUpperCase()}`}</Text>
        </View>
        <View style={styles.etherscanContainer}>
          <TouchableOpacity onPress={onEtherscanPress}>
            <Image
              source={etherscanThemedImage}
              style={styles.etherscanImage}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.forgetLedgerContainer}>
        <TouchableOpacity onPress={onForgetDevice}>
          <Text blue>{strings('ledger.forget_device')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LedgerAccountInfo;
