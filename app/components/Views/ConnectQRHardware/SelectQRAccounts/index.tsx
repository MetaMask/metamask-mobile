import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import CheckBox from '@react-native-community/checkbox';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';
import { fontStyles } from '../../../../styles/common';
import { IAccount } from '../types';
import { renderFromWei } from '../../../../util/number';
import { getEtherscanAddressUrl } from '../../../../util/etherscan';
import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';
import EthereumAddress from '../../../UI/EthereumAddress';
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
      alignItems: 'center',
      height: 36,
      width: '100%',
      paddingVertical: 4,
    },
    checkBox: {
      marginRight: 8,
    },
    accountUnchecked: {
      backgroundColor: colors.primary.muted,
    },
    accountChecked: {
      backgroundColor: colors.primary.disabled,
    },
    number: {
      ...fontStyles.normal,
      color: colors.text.default,
    },
    address: {
      marginLeft: 8,
      fontSize: 15,
      flexGrow: 1,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    pagination: {
      marginTop: 16,
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'center',
    },
    paginationText: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.primary.default,
    },
    paginationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
    },
    bottom: {
      alignItems: 'center',
      marginTop: 150,
      height: 100,
      justifyContent: 'space-between',
    },
    button: {
      width: '100%',
      padding: 12,
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
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyle(colors);
  const navigation = useNavigation();
  const provider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );

  const toEtherscan = (address: string) => {
    const accountLink = getEtherscanAddressUrl(provider.type, address);
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: accountLink,
      },
    });
  };

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
              testID={'skip-backup-check'}
            />
            <Text style={styles.number}>{item.index}</Text>
            <EthereumAddress
              address={item.address}
              style={styles.address}
              type={'short'}
            />
            <Text style={styles.address}>
              {renderFromWei(item.balance)} {provider.ticker}
            </Text>
            <Icon
              size={18}
              name={'external-link'}
              onPress={() => toEtherscan(item.address)}
              color={colors.text.default}
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
