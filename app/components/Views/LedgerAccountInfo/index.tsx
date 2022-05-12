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
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { renderFromWei } from '../../../util/number';

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
    closeButtonWrapper: {
      alignSelf: 'flex-end',
      padding: 20,
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
  const { KeyringController, AccountTrackerController } = Engine.context;
  const navigation = useNavigation();
  const [account, setAccount] = useState();
  const [accountBalance, setAccountBalance] = useState<string>();
  const { colors } = useAppThemeFromContext() ?? mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    navigation.navigate('SelectHardwareWallet');
  };

  const getEthAmountForAccount = async (account: string) => {
    if (account) {
      const ethValue = await AccountTrackerController.syncBalanceWithAddresses([
        account,
      ]);
      const decimalETHValue = renderFromWei(ethValue[account]?.balance);
      setAccountBalance(decimalETHValue?.toString() ?? 0);
    }
  };

  const onClosePress = () => {
    navigation.navigate('SelectHardwareWallet');
  };

  useEffect(() => {
    if (account) {
      getEthAmountForAccount(account);
    }
  }, [account]);

  const sliceAccountString = (account: string) =>
    `${account?.slice(0, 5)}...${account?.slice(-5)}`;

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
      <View style={styles.closeButtonWrapper}>
        <TouchableOpacity onPress={onClosePress}>
          <Text big bold>
            X
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.imageWrapper}>
        <Image
          source={useAssetFromTheme(
            ledgerDeviceLightImage,
            ledgerDeviceDarkImage,
          )}
        ></Image>
      </View>
      <View style={styles.textWrapper}>
        <Text big style={styles.accountCountText}>
          {strings('ledger.ledger_account_count')}
        </Text>
      </View>
      <View style={styles.accountsContainer}>
        <View style={styles.textContainer}>
          {/* In the future, there will need to be a mapping, if MM/Ledger decide on supporting multiple accounts */}
          <Text big bold>
            1
          </Text>
          <Text grey>{sliceAccountString(account)}</Text>
          <Text>{`${accountBalance} ETH`}</Text>
        </View>
        <View style={styles.etherscanContainer}>
          <TouchableOpacity onPress={onEtherscanPress}>
            <Image
              source={useAssetFromTheme(
                etherscanLightImage,
                etherscanDarkImage,
              )}
              style={styles.etherscanImage}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.forgetLedgerContainer}>
        <TouchableOpacity onPress={onForgetDevice}>
          <Text blue> Forget Ledger</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LedgerAccountInfo;
