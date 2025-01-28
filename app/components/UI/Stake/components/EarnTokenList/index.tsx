import React, { useCallback, useMemo } from 'react';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './EarnTokenList.styles';
import { useSelector } from 'react-redux';
import { RootState } from '../../../BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../../../util/networks';
import { selectAccountTokensAcrossChains } from '../../../../../selectors/multichain';
import { TokenI } from '../../../Tokens/types';
import { ScrollView } from 'react-native-gesture-handler';
import BigNumber from 'bignumber.js';
import { deriveBalanceFromAssetMarketDetails } from '../../../Tokens/util';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { strings } from '../../../../../../locales/i18n';
import UpsellBanner from '../UpsellBanner';
import { UPSELL_BANNER_VARIANTS } from '../UpsellBanner/UpsellBanner.types';
import { isStablecoinLendingFeatureEnabled } from '../../constants';
import {
  filterEligibleTokens,
  getSupportedEarnTokens,
} from '../../utils/token';
import EarnTokenListItem from '../EarnTokenListItem';
import Engine from '../../../../../core/Engine';
import { STAKE_INPUT_VIEW_ACTIONS } from '../../Views/StakeInputView/StakeInputView.types';
import { getNetworkClientIdByChainId } from '../../utils/network';
import useStakingEligibility from '../../hooks/useStakingEligibility';

const isEmptyBalance = (token: { tokenBalanceFormatted: string }) =>
  parseFloat(token?.tokenBalanceFormatted) === 0;

// Temporary: Will be replaced by actual API call in near future.
export const MOCK_STABLECOIN_API_RESPONSE: { [key: string]: string } = {
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
  Ethereum: '2.3',
};

// Temporary: Will be replaced by actual API call in near future.
const MOCK_ESTIMATE_REWARDS = '$454';

const EarnTokenList = () => {
  const { createEventBuilder, trackEvent } = useMetrics();

  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const tokens = useSelector((state: RootState) =>
    isPortfolioViewEnabled() ? selectAccountTokensAcrossChains(state) : {},
  );

  const {
    isEligible: isEligibleToStake,
    isLoadingEligibility: isLoadingStakingEligibility,
  } = useStakingEligibility();

  const multiChainTokenBalance = useSelector(selectTokensBalances);

  const multiChainMarketData = useSelector(selectTokenMarketData);

  const multiChainCurrencyRates = useSelector(selectCurrencyRates);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const currentCurrency = useSelector(selectCurrentCurrency);

  const getTokenBalance = useCallback(
    (token: TokenI) => {
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
        balanceFiat,
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

  const supportedStablecoins = useMemo(() => {
    if (isLoadingStakingEligibility) return [];

    const allTokens = Object.values(tokens).flat() as TokenI[];

    if (!allTokens.length) return [];

    const supportedTokens = getSupportedEarnTokens(allTokens);

    const eligibleTokens = filterEligibleTokens(
      supportedTokens,
      // Temporary: hardcoded canLend will be replaced before launch with an eligibility check.
      { canStake: isEligibleToStake, canLend: true },
    );

    const eligibleTokensWithBalances = eligibleTokens?.map((token) =>
      getTokenBalance(token),
    );

    // Tokens with a balance of 0 are placed at the end of the list.
    return eligibleTokensWithBalances.sort((a, b) => {
      const fiatBalanceA = parseFloat(a.tokenBalanceFormatted);
      const fiatBalanceB = parseFloat(b.tokenBalanceFormatted);

      return (fiatBalanceA === 0 ? 1 : 0) - (fiatBalanceB === 0 ? 1 : 0);
    });
  }, [getTokenBalance, isEligibleToStake, isLoadingStakingEligibility, tokens]);

  const handleRedirectToInputScreen = async (token: TokenI) => {
    const networkClientId = getNetworkClientIdByChainId(token.chainId as Hex);

    if (!networkClientId) {
      console.error(
        `EarnTokenListItem redirect failed: could not retrieve networkClientId for chainId: ${token.chainId}`,
      );
      return;
    }

    await Engine.context.NetworkController.setActiveNetwork(networkClientId);

    const action = token.isETH
      ? STAKE_INPUT_VIEW_ACTIONS.STAKE
      : STAKE_INPUT_VIEW_ACTIONS.LEND;

    navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token, action },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_TOKEN_LIST_ITEM_CLICKED)
        .addProperties({
          provider: EVENT_PROVIDERS.CONSENSYS,
          location: EVENT_LOCATIONS.TAB_BAR,
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
          {strings('stake.select_a_token')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <UpsellBanner
          primaryText={strings('stake.you_could_earn')}
          secondaryText={MOCK_ESTIMATE_REWARDS}
          tertiaryText={strings('stake.per_year_on_your_tokens')}
          variant={UPSELL_BANNER_VARIANTS.HEADER}
        />
        <ScrollView>
          {supportedStablecoins?.map(
            (token, index) =>
              token?.chainId && (
                <View
                  style={styles.listItemContainer}
                  key={`${token.name}-${token.symbol}-${index}`}
                >
                  <EarnTokenListItem
                    token={token}
                    onPress={handleRedirectToInputScreen}
                    primaryText={{
                      value: `${new BigNumber(
                        MOCK_STABLECOIN_API_RESPONSE[token.symbol],
                      ).toFixed(1, BigNumber.ROUND_DOWN)}% ${strings(
                        'stake.apr',
                      )}`,
                      color: TextColor.Success,
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
      </View>
    </BottomSheet>
  );
};

/**
 * Temporary wrapper to prevent rending if feature flags aren't enabled.
 * We can delete this wrapped once these feature flags are removed.
 */
const EarnTokenListWrapper = () => {
  if (isStablecoinLendingFeatureEnabled() && isPortfolioViewEnabled()) {
    return <EarnTokenList />;
  }

  return <></>;
};

export default EarnTokenListWrapper;
