import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import CheckBox from '@react-native-community/checkbox';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import { IAccount } from '../types';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../../constants/network';
import { getEtherscanAddressUrl } from '../../../../util/etherscan';
import { findBlockExplorerForRpc } from '../../../../util/networks';
import Device from '../../../../util/device';
import { useTheme } from '../../../../util/theme';
import AccountDetails from '../AccountDetails';
import StyledButton from '../../../UI/StyledButton';

interface ISelectQRAccountsProps {
  canUnlock: boolean;
  accounts: IAccount[];
  nextPage: () => void;
  prevPage: () => void;
  toggleAccount: (index: number) => void;
  onUnlock: () => void;
  onForget: () => void;
}

const createStyle = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 32,
    },
    title: {
      marginTop: 40,
      fontSize: 24,
      marginBottom: 24,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    account: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    checkBox: {
      backgroundColor: colors.background.default,
    },
    number: {
      ...fontStyles.normal,
      color: colors.text.default,
    },
    pagination: {
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'center',
    },
    paginationText: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.primary.default,
      paddingHorizontal: 10,
    },
    paginationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
    },
    bottom: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 70,
      paddingBottom: Device.isIphoneX() ? 20 : 10,
    },
    button: {
      width: '100%',
      justifyContent: 'flex-end',
      paddingTop: 15,
    },
  });

const SelectQRAccounts = (props: ISelectQRAccountsProps) => {
  const {
    accounts,
    prevPage,
    nextPage,
    toggleAccount,
    onForget,
    onUnlock,
    canUnlock,
  } = props;
  const { colors } = useTheme();
  const styles = createStyle(colors);
  const navigation = useNavigation();
  const provider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

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
    <View style={styles.container}>
      <Text style={styles.title}>
        {strings('connect_qr_hardware.select_accounts')}
      </Text>
      <FlatList
        data={accounts}
        keyExtractor={(item) => `address-${item.index}`}
        renderItem={({ item }) => (
          <View style={[styles.account]}>
            <CheckBox
              style={[styles.checkBox]}
              disabled={item.exist}
              value={item.checked}
              onValueChange={() => toggleAccount(item.index)}
              boxType={'square'}
              tintColors={{
                true: colors.primary.default,
                false: colors.border.default,
              }}
              onCheckColor={colors.background.default}
              onFillColor={colors.primary.default}
              onTintColor={colors.primary.default}
              testID={'skip-backup-check'}
            />
            <AccountDetails
              index={item.index}
              address={item.address}
              balance={item.balance}
              ticker={provider.ticker}
              toBlockExplorer={toBlockExplorer}
            />
          </View>
        )}
      />
      <View style={styles.pagination}>
        <TouchableOpacity style={styles.paginationItem} onPress={prevPage}>
          <Icon name={'chevron-left'} color={colors.primary.default} />
          <Text style={styles.paginationText}>
            {strings('connect_qr_hardware.prev')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.paginationItem} onPress={nextPage}>
          <Text style={styles.paginationText}>
            {strings('connect_qr_hardware.next')}
          </Text>
          <Icon name={'chevron-right'} color={colors.primary.default} />
        </TouchableOpacity>
      </View>
      <View style={styles.bottom}>
        <StyledButton
          type={'confirm'}
          onPress={onUnlock}
          containerStyle={[styles.button]}
          disabled={!canUnlock}
        >
          {strings('connect_qr_hardware.unlock')}
        </StyledButton>
        <StyledButton
          type={'transparent-blue'}
          onPress={onForget}
          containerStyle={[styles.button]}
        >
          {strings('connect_qr_hardware.forget')}
        </StyledButton>
      </View>
    </View>
  );
};

export default SelectQRAccounts;
