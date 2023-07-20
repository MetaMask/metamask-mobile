import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Token as TokenType } from '@metamask/assets-controllers';
import EthereumAddress from '../../../UI/EthereumAddress';
import Icon from 'react-native-vector-icons/Feather';
import CheckBox from '@react-native-community/checkbox';
import { strings } from '../../../../../locales/i18n';
import TokenImage from '../../../UI/TokenImage';
import { fontStyles } from '../../../../styles/common';
import { useDispatch, useSelector } from 'react-redux';
import { showAlert } from '../../../../actions/alert';
import ClipboardManager from '../../../../core/ClipboardManager';
import {
  balanceToFiat,
  renderFromTokenMinimalUnit,
} from '../../../../util/number';
import { useTheme } from '../../../../util/theme';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectContractBalances } from '../../../../selectors/tokenBalancesController';

const createStyles = (colors: any) =>
  StyleSheet.create({
    logo: {
      height: 40,
      width: 40,
    },
    tokenContainer: { flexDirection: 'row', paddingVertical: 16 },
    tokenInfoContainer: { flex: 1, marginLeft: 8, marginRight: 16 },
    tokenUnitLabel: {
      ...(fontStyles.normal as any),
      fontSize: 18,
      color: colors.text.default,
      marginBottom: 4,
    },
    tokenDollarLabel: {
      ...(fontStyles.normal as any),
      fontSize: 14,
      color: colors.text.alternative,
      marginBottom: 4,
    },
    tokenAddressContainer: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    tokenAddressLabel: {
      ...(fontStyles.normal as any),
      fontSize: 14,
      color: colors.text.alternative,
    },
    addressLinkContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addressLinkLabel: {
      ...(fontStyles.normal as any),
      fontSize: 14,
      color: colors.primary.default,
    },
    copyIcon: {
      marginLeft: 4,
      color: colors.primary.default,
    },
    tokenAggregatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    tokenAggregatorLabel: {
      ...(fontStyles.normal as any),
      fontSize: 14,
      color: colors.text.default,
    },
    aggregatorLinkLabel: {
      ...(fontStyles.normal as any),
      fontSize: 14,
      color: colors.primary.default,
    },
    checkBox: { height: 18 },
  });

interface Props {
  token: TokenType;
  selected: boolean;
  toggleSelected: (selected: boolean) => void;
}

const Token = ({ token, selected, toggleSelected }: Props) => {
  const { address, symbol, aggregators, decimals } = token;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [expandTokenList, setExpandTokenList] = useState(false);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const tokenBalances = useSelector(selectContractBalances);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const exchangeRate = tokenExchangeRates[address];
  const tokenBalance = renderFromTokenMinimalUnit(
    tokenBalances[address],
    decimals,
  );
  const tokenBalanceWithSymbol = `${
    tokenBalance === undefined ? '' : `${tokenBalance} `
  }${symbol}`;
  const fiatBalance = balanceToFiat(
    tokenBalance,
    conversionRate,
    exchangeRate,
    currentCurrency,
  );

  const showMoreLink = !expandTokenList && aggregators.length > 2;
  const dispatch = useDispatch();

  const triggerShowAlert = () =>
    dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: strings('detected_tokens.address_copied_to_clipboard') },
      }),
    );

  const copyAddressToClipboard = async () => {
    await ClipboardManager.setString(address);
    triggerShowAlert();
  };

  const triggerExpandTokenList = () => {
    setExpandTokenList(true);
  };

  const triggerToggleSelected = () => {
    toggleSelected(!selected);
  };

  return (
    <View style={styles.tokenContainer}>
      <TokenImage
        asset={token}
        containerStyle={styles.logo}
        iconStyle={styles.logo}
      />
      <View style={styles.tokenInfoContainer}>
        <Text style={styles.tokenUnitLabel}>{tokenBalanceWithSymbol}</Text>
        {fiatBalance ? (
          <Text style={styles.tokenDollarLabel}>{fiatBalance}</Text>
        ) : null}
        <View style={styles.tokenAddressContainer}>
          <Text style={styles.tokenAddressLabel}>
            {strings('detected_tokens.token_address')}
          </Text>
          <TouchableOpacity
            onPress={copyAddressToClipboard}
            style={styles.addressLinkContainer}
          >
            <EthereumAddress
              style={styles.addressLinkLabel}
              address={address}
              type={'short'}
            />
            <Icon style={styles.copyIcon} name={'copy'} size={16} />
          </TouchableOpacity>
        </View>
        <View style={styles.tokenAggregatorContainer}>
          <Text style={styles.tokenAggregatorLabel}>
            {strings('detected_tokens.token_lists', {
              listNames: aggregators
                .slice(0, expandTokenList ? aggregators.length : 2)
                .join(', '),
            })}
          </Text>
          {showMoreLink ? (
            <TouchableOpacity onPress={triggerExpandTokenList}>
              <Text style={styles.aggregatorLinkLabel}>
                {strings('detected_tokens.token_more', {
                  remainingListCount: aggregators.slice(2, aggregators.length)
                    .length,
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <CheckBox
        style={styles.checkBox}
        value={selected}
        onValueChange={triggerToggleSelected}
        boxType={'square'}
        tintColors={{
          true: colors.primary.default,
          false: colors.border.default,
        }}
      />
    </View>
  );
};

export default Token;
