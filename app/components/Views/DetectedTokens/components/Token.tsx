import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TouchableOpacity from '../../../Base/TouchableOpacity';
import {
  MarketDataDetails,
  Token as TokenType,
} from '@metamask/assets-controllers';
import EthereumAddress from '../../../UI/EthereumAddress';
import Icon from 'react-native-vector-icons/Feather';
import CheckBox from '@react-native-community/checkbox';
import { strings } from '../../../../../locales/i18n';
import TokenImage from '../../../UI/TokenImage';
import { fontStyles } from '../../../../styles/common';
import { useDispatch, useSelector } from 'react-redux';
import { showAlert } from '../../../../actions/alert';
import ClipboardManager from '../../../../core/ClipboardManager';
import { selectEvmChainId } from '../../../../selectors/networkController';
import {
  balanceToFiat,
  renderFromTokenMinimalUnit,
} from '../../../../util/number';
import { useTheme } from '../../../../util/theme';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { Colors } from '../../../../util/theme/models';
import { Hex } from '@metamask/utils';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../UI/AssetOverview/Balance/Balance';
import { CURRENCY_SYMBOL_BY_CHAIN_ID } from '../../../../constants/network';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    logo: {
      height: 40,
      width: 40,
    },
    tokenContainer: { flexDirection: 'row', paddingVertical: 16 },
    tokenInfoContainer: { flex: 1, marginLeft: 8, marginRight: 16 },
    tokenUnitLabel: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.text.default,
      marginBottom: 4,
    },
    tokenDollarLabel: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.alternative,
      marginBottom: 4,
    },
    tokenAddressContainer: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    tokenAddressLabel: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.alternative,
    },
    addressLinkContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addressLinkLabel: {
      ...fontStyles.normal,
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
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
    },
    aggregatorLinkLabel: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.primary.default,
    },
    checkBox: { height: 18 },
  });

interface Props {
  token: TokenType & { chainId: Hex };
  selected: boolean;
  toggleSelected: (selected: boolean) => void;
}

const Token = ({ token, selected, toggleSelected }: Props) => {
  const { address, symbol, aggregators = [], decimals } = token;
  const accountAddress = useSelector(selectSelectedInternalAccountAddress);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [expandTokenList, setExpandTokenList] = useState(false);
  const tokenExchangeRatesAllChains = useSelector(selectTokenMarketData);
  const currentChainId = useSelector(selectEvmChainId);
  const tokenExchangeRates = tokenExchangeRatesAllChains[token.chainId];
  const tokenBalancesAllChains = useSelector(selectTokensBalances);
  const balanceAllChainsForAccount =
    tokenBalancesAllChains?.[accountAddress as Hex] ?? {};
  const chainIdToUse = token.chainId ?? currentChainId;
  const tokenBalances = balanceAllChainsForAccount?.[chainIdToUse];
  const conversionRateByChainId = useSelector(selectCurrencyRates);

  const conversionRate =
    conversionRateByChainId[CURRENCY_SYMBOL_BY_CHAIN_ID[token.chainId]]
      ?.conversionRate;

  const currentCurrency = useSelector(selectCurrentCurrency);

  const tokenMarketData =
    (tokenExchangeRates as Record<Hex, MarketDataDetails>)?.[address as Hex] ??
    null;
  const tokenBalance = renderFromTokenMinimalUnit(
    tokenBalances[address as Hex],
    decimals,
  );
  const tokenBalanceWithSymbol = `${
    tokenBalance === undefined ? '' : `${tokenBalance} `
  }${symbol}`;
  const fiatBalance = balanceToFiat(
    tokenBalance,
    conversionRate,
    tokenMarketData?.price || undefined,
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
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={NetworkBadgeSource(chainIdToUse)}
          />
        }
      >
        <TokenImage
          asset={token}
          containerStyle={styles.logo}
          iconStyle={styles.logo}
        />
      </BadgeWrapper>

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
