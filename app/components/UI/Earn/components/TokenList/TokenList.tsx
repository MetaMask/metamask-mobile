import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';
import BigNumber from 'bignumber.js';
import { Hex } from '@metamask/utils';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
  EARN_ACTIONS,
} from '../../constants';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../../../util/networks';
import { selectAccountTokensAcrossChains } from '../../../../../selectors/multichain';
import { TokenI } from '../../../Tokens/types';
import { EarnTokenI } from '../../types/token';
import { deriveBalanceFromAssetMarketDetails } from '../../../Tokens/util';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import Engine from '../../../../../core/Engine';
import UpsellBanner from '../UpsellBanner';
import { UPSELL_BANNER_VARIANTS } from '../UpsellBanner/UpsellBanner.types';
import TokenListItem from '../TokenListItem';
import {
  filterEligibleTokens,
  getSupportedEarnTokens,
} from '../../utils/token';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import styleSheet, { TokenListStyles } from './TokenList.styles';
import { RootState } from '../../../../../reducers';

// Temporary: Will be replaced by actual API call in near future.
export const MOCK_APR_RATES: { [key: string]: string } = {
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
  Ethereum: '2.3',
};

// Temporary: Will be replaced by actual API call in near future.
const MOCK_ESTIMATE_REWARDS = '$454';

const TokenListSkeletonPlaceholder = () => (
  <SkeletonPlaceholder>
    <SkeletonPlaceholder.Item
      width={'auto'}
      height={150}
      borderRadius={8}
      marginBottom={12}
    />
    <>
      {[1, 2, 3, 4, 5].map((value) => (
        <SkeletonPlaceholder.Item
          key={value}
          width={'auto'}
          height={42}
          borderRadius={8}
          margin={16}
        />
      ))}
    </>
  </SkeletonPlaceholder>
);

const isEmptyBalance = (token: EarnTokenI) =>
  parseFloat(token.tokenBalanceFormatted) === 0;

const TokenList = () => {
  const { styles } = useStyles<TokenListStyles>(styleSheet, {});
  const { navigate } = useNavigation();
  const { createEventBuilder, trackEvent } = useMetrics();

  const tokens = useSelector((state: RootState) =>
    isPortfolioViewEnabled() ? selectAccountTokensAcrossChains(state) : {},
  );

  const multiChainTokenBalance = useSelector(selectTokensBalances);
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const getTokenBalance = useCallback(
    (token: TokenI): EarnTokenI => {
      const tokenChainId = token.chainId as Hex;
      const nativeCurrency =
        networkConfigurations?.[tokenChainId]?.nativeCurrency;

      const { balanceValueFormatted, balanceFiat } =
        deriveBalanceFromAssetMarketDetails(
          token,
          multiChainMarketData?.[tokenChainId] || {},
          multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
            tokenChainId
          ] || {},
          multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0,
          currentCurrency || '',
        );

      return {
        ...token,
        tokenBalanceFormatted: balanceValueFormatted,
        balanceFiat: balanceFiat || '0',
      };
    },
    [
      currentCurrency,
      multiChainCurrencyRates,
      multiChainMarketData,
      multiChainTokenBalance,
      networkConfigurations,
      selectedInternalAccountAddress,
    ],
  );

  const availableTokens = useMemo(() => {
    const allTokens = Object.values(tokens).flat() as TokenI[];
    if (!allTokens.length) return [];

    const supportedTokens = getSupportedEarnTokens(allTokens);
    const eligibleTokens = filterEligibleTokens(supportedTokens, {
      canStake: true,
      canLend: true,
    });

    const eligibleTokensWithBalances = eligibleTokens?.map((token: TokenI) =>
      getTokenBalance(token),
    );

    return eligibleTokensWithBalances.sort((a: EarnTokenI, b: EarnTokenI) => {
      const fiatBalanceA = parseFloat(a.tokenBalanceFormatted);
      const fiatBalanceB = parseFloat(b.tokenBalanceFormatted);
      return (fiatBalanceA === 0 ? 1 : 0) - (fiatBalanceB === 0 ? 1 : 0);
    });
  }, [getTokenBalance, tokens]);

  const handleRedirectToInputScreen = async (token: EarnTokenI) => {
    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      token.chainId as Hex,
    );

    if (!networkClientId) {
      console.error(
        `TokenList redirect failed: could not retrieve networkClientId for chainId: ${token.chainId}`,
      );
      return;
    }

    await Engine.context.NetworkController.setActiveNetwork(networkClientId);

    const action = token.isETH ? EARN_ACTIONS.STAKE : EARN_ACTIONS.LEND;

    navigate('EarnScreens', {
      screen: Routes.EARN.INPUT,
      params: { token, action },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_TOKEN_LIST_ITEM_CLICKED)
        .addProperties({
          provider: 'consensys',
          location: 'wallet_actions_bottom_sheet',
          token_name: token.name,
          token_symbol: token.symbol,
          token_chain_id: getDecimalChainId(token.chainId),
          action,
        })
        .build(),
    );
  };

  return (
    <BottomSheet>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingSM}>
          {strings('earn.select_a_token')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        {availableTokens?.length ? (
          <>
            <UpsellBanner
              primaryText={strings('earn.you_could_earn')}
              secondaryText={MOCK_ESTIMATE_REWARDS}
              tertiaryText={strings('earn.per_year_on_your_tokens')}
              variant={UPSELL_BANNER_VARIANTS.HEADER}
            />
            <ScrollView>
              {availableTokens?.map(
                (token: EarnTokenI, index: number) =>
                  token?.chainId && (
                    <View
                      style={styles.listItemContainer}
                      key={`${token.name}-${token.symbol}-${index}`}
                    >
                      <TokenListItem
                        token={token}
                        onPress={handleRedirectToInputScreen}
                        primaryText={{
                          value: `${new BigNumber(
                            MOCK_APR_RATES[token.symbol],
                          ).toFixed(1, BigNumber.ROUND_DOWN)}% ${strings(
                            'earn.apr',
                          )}`,
                        }}
                        {...(!isEmptyBalance(token) && {
                          secondaryText: {
                            value: token.tokenBalanceFormatted,
                          },
                        })}
                      />
                    </View>
                  ),
              )}
            </ScrollView>
          </>
        ) : (
          <TokenListSkeletonPlaceholder />
        )}
      </View>
    </BottomSheet>
  );
};

export default TokenList;
