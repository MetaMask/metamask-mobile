import React, {
  useRef,
  useCallback,
  useEffect,
  useReducer,
  useMemo,
} from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './EarnTokenList.styles';
import { getDecimalChainId } from '../../../../../util/networks';
import { TokenI } from '../../../Tokens/types';
import { FlatList } from 'react-native-gesture-handler';
import { Hex } from '@metamask/utils';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../Stake/constants/events';
import { strings } from '../../../../../../locales/i18n';
import UpsellBanner from '../../../Stake/components/UpsellBanner';
import { UPSELL_BANNER_VARIANTS } from '../../../Stake/components/UpsellBanner/UpsellBanner.types';
import Engine from '../../../../../core/Engine';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import useEarnTokens from '../../hooks/useEarnTokens';
import { useSelector } from 'react-redux';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../selectors/featureFlags';
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';
import {
  isTronChainId,
  isNonEvmChainId,
} from '../../../../../core/Multichain/utils';
import useEarnNetworkPolling from '../../hooks/useEarnNetworkPolling';
import { EARN_INPUT_VIEW_ACTIONS } from '../../Views/EarnInputView/EarnInputView.types';
import EarnDepositTokenListItem from '../EarnDepositTokenListItem';
import EarnWithdrawalTokenListItem from '../EarnWithdrawalTokenListItem';
import { EarnTokenDetails } from '../../types/lending.types';
import BN4 from 'bnjs4';
import {
  sortByHighestBalance,
  sortByHighestRewards,
  truncateNumber,
} from '../../utils';
import { trace, TraceName, endTrace } from '../../../../../util/trace';
import useTronStakeApy from '../../hooks/useTronStakeApy';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
  MUSD_CONVERSION_APY,
} from '../../constants/musd';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';

const isEmptyBalance = (token: { balanceFormatted: string }) =>
  parseFloat(token?.balanceFormatted) === 0;

/**
 * USDcv (USD CoinVertible) - hardcoded fake token data.
 * Not yet supported by the API, displayed for POC purposes only.
 */
const USDCV_FAKE_TOKEN: EarnTokenDetails = {
  address: '0x0000000000000000000000000000000000USDcv1',
  decimals: 6,
  image: '',
  name: 'USD CoinVertible',
  symbol: 'USDcv',
  balance: '0',
  balanceFiat: '$0.00',
  logo: undefined,
  isETH: false,
  isStaked: false,
  chainId: CHAIN_IDS.MAINNET,
  isNative: false,
  ticker: 'USDcv',
  balanceFormatted: '< 0.00001 USDcv',
  balanceMinimalUnit: '0',
  balanceFiatNumber: 0,
  tokenUsdExchangeRate: 1,
  experience: {
    type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    apr: '3.6',
    estimatedAnnualRewardsFormatted: '$0.00',
    estimatedAnnualRewardsFiatNumber: 0,
    estimatedAnnualRewardsTokenMinimalUnit: '0',
    estimatedAnnualRewardsTokenFormatted: '0 USDcv',
  },
  experiences: [
    {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: '3.6',
      estimatedAnnualRewardsFormatted: '$0.00',
      estimatedAnnualRewardsFiatNumber: 0,
      estimatedAnnualRewardsTokenMinimalUnit: '0',
      estimatedAnnualRewardsTokenFormatted: '0 USDcv',
    },
  ],
};

/**
 * mUSD fallback token — shown even when the user doesn't hold it.
 * Mirrors the USDcv pattern so mUSD always appears in DEPOSIT mode.
 */
const MUSD_FALLBACK_TOKEN: EarnTokenDetails = {
  address: MUSD_TOKEN_ADDRESS,
  decimals: MUSD_TOKEN.decimals,
  image: '',
  name: MUSD_TOKEN.name,
  symbol: MUSD_TOKEN.symbol,
  balance: '0',
  balanceFiat: '$0.00',
  logo: undefined,
  isETH: false,
  isStaked: false,
  chainId: CHAIN_IDS.MAINNET,
  isNative: false,
  ticker: MUSD_TOKEN.symbol,
  balanceFormatted: '0 mUSD',
  balanceMinimalUnit: '0',
  balanceFiatNumber: 0,
  tokenUsdExchangeRate: 1,
  experience: {
    type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    apr: String(MUSD_CONVERSION_APY),
    estimatedAnnualRewardsFormatted: '$0.00',
    estimatedAnnualRewardsFiatNumber: 0,
    estimatedAnnualRewardsTokenMinimalUnit: '0',
    estimatedAnnualRewardsTokenFormatted: `0 ${MUSD_TOKEN.symbol}`,
  },
  experiences: [
    {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: String(MUSD_CONVERSION_APY),
      estimatedAnnualRewardsFormatted: '$0.00',
      estimatedAnnualRewardsFiatNumber: 0,
      estimatedAnnualRewardsTokenMinimalUnit: '0',
      estimatedAnnualRewardsTokenFormatted: `0 ${MUSD_TOKEN.symbol}`,
    },
  ],
};

/**
 * Returns the priority index of a token in the hardcoded top-5 list.
 * Order: MUSD (0), ETH (1), USDT (2), USDC (3), USDcv (4)
 * Returns -1 if the token is not in the priority list.
 */
function getPriorityIndex(token: EarnTokenDetails): number {
  if (token.symbol === 'mUSD' || token.name === 'MetaMask USD') return 0;
  if (token.isETH && !token.isStaked) return 1;
  if (token.symbol === 'USDT' && !token.isStaked) return 2;
  if (token.symbol === 'USDC' && !token.isStaked) return 3;
  if (token.symbol === 'USDcv') return 4;
  return -1;
}

const EarnTokenListSkeletonPlaceholder = () => (
  <View testID="earn-token-list-skeleton">
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
  </View>
);

interface EarnTokenListViewRouteParams {
  tokenFilter: {
    includeReceiptTokens: boolean;
  };
  onItemPressScreen: string;
}

export interface EarnTokenListProps {
  route: RouteProp<{ params: EarnTokenListViewRouteParams }, 'params'>;
}

const EarnTokenList = () => {
  useEarnNetworkPolling();

  // Temp: Used as workaround for BadgeNetwork not properly anchoring to its parent BadgeWrapper.
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const { createEventBuilder, trackEvent } = useAnalytics();
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { navigate } = navigation;
  const { params } = useRoute<EarnTokenListProps['route']>();
  const traceEndedRef = useRef(false);

  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);
  const { includeReceiptTokens } = params?.tokenFilter ?? {};

  const { apyDecimal: tronApyDecimal } = useTronStakeApy();

  const { earnTokens, earnOutputTokens, earnableTotalFiatFormatted } =
    useEarnTokens();

  const tokens = includeReceiptTokens ? earnOutputTokens : earnTokens;

  // End trace when earn tokens data becomes available (only once)
  useEffect(() => {
    if (earnTokens?.length && !traceEndedRef.current) {
      endTrace({ name: TraceName.EarnTokenList });
      traceEndedRef.current = true;
    }
  }, [earnTokens?.length]);

  // Temp workaround for BadgeNetwork component not anchoring correctly on initial render.
  useEffect(() => {
    const timer = setTimeout(() => {
      forceUpdate();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const redirectToDepositScreen = useCallback(
    async (token: TokenI) => {
      trace({ name: TraceName.EarnDepositScreen });
      navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: { token },
      });
    },
    [navigate],
  );

  const redirectToWithdrawalScreen = useCallback(
    (token: TokenI) => {
      trace({ name: TraceName.EarnWithdrawScreen });
      navigate('StakeScreens', {
        screen: Routes.STAKING.UNSTAKE,
        params: { token },
      });
    },
    [navigate],
  );

  const prepareNetworkForToken = async (token: TokenI): Promise<boolean> => {
    if (isNonEvmChainId(String(token.chainId))) {
      return true;
    }
    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      token.chainId as Hex,
    );
    if (!networkClientId) {
      console.error(
        `EarnTokenList redirect failed: could not retrieve networkClientId for chainId: ${token.chainId}`,
      );
      return false;
    }
    await NetworkController.setActiveNetwork(networkClientId);
    return true;
  };

  const handleRedirectToInputScreen = useCallback(
    async (token: TokenI) => {
      // USDcv is not yet supported - do nothing on press
      if (token.symbol === 'USDcv') {
        return;
      }

      const isReady = await prepareNetworkForToken(token);
      if (!isReady) return;

      const onItemPressScreen = params?.onItemPressScreen ?? '';

      if (onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.DEPOSIT) {
        redirectToDepositScreen(token);
      } else if (onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.WITHDRAW) {
        redirectToWithdrawalScreen(token);
      }

      trackEvent(
        createEventBuilder(EVENT_NAME.EARN_TOKEN_LIST_ITEM_CLICKED)
          .addProperties({
            provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
            token_name: token.name,
            token_symbol: token.symbol,
            token_chain_id: getDecimalChainId(token.chainId),
          })
          .build(),
      );
    },
    [
      params?.onItemPressScreen,
      redirectToDepositScreen,
      redirectToWithdrawalScreen,
      trackEvent,
      createEventBuilder,
    ],
  );

  const isNoEarnableTokensWithBalance = useMemo(
    () =>
      earnTokens?.every((token) =>
        new BN4(token.balanceMinimalUnit).eq(new BN4(0)),
      ),
    [earnTokens],
  );

  const getTokenApr = useCallback(
    (token: EarnTokenDetails): number => {
      const isTronNative =
        Boolean(token.isNative) && isTronChainId(String(token.chainId));

      if (isTronNative && tronApyDecimal) {
        return parseFloat(tronApyDecimal);
      }

      return parseFloat(token?.experience?.apr || '0');
    },
    [tronApyDecimal],
  );

  const highestAvailableApr = useMemo(
    () =>
      earnTokens?.reduce((highestApr, token) => {
        const parsedApr = getTokenApr(token);
        return parsedApr > highestApr ? parsedApr : highestApr;
      }, 0),
    [earnTokens, getTokenApr],
  );

  /**
   * Build the final token list:
   * - DEPOSIT mode: all tokens shown (no balance filter), hardcoded top-5 order + dynamic tail by balance
   * - WITHDRAW mode: original behavior (sorted by balance)
   */
  const filteredTokens = useMemo(() => {
    if (!tokens?.length) return [];

    const onItemPressScreen = params?.onItemPressScreen;

    // WITHDRAW mode: keep original behavior
    if (onItemPressScreen !== EARN_INPUT_VIEW_ACTIONS.DEPOSIT) {
      const tokensSorted = [...sortByHighestBalance(tokens)];
      return tokensSorted.filter((token) => {
        if (token.isETH && !token.isStaked && !isPooledStakingEnabled) {
          return false;
        }
        return token?.chainId;
      });
    }

    // DEPOSIT mode: show ALL tokens, no balance filter, with hardcoded priority order
    const allTokens = [...tokens];

    // Add mUSD fallback if user doesn't hold it
    const hasMUSD = allTokens.some(
      (t) => t.symbol === 'mUSD' || t.name === 'MetaMask USD',
    );
    if (!hasMUSD) {
      allTokens.push(MUSD_FALLBACK_TOKEN);
    }

    // Add USDcv fake token if not already present
    const hasUSDcv = allTokens.some((t) => t.symbol === 'USDcv');
    if (!hasUSDcv) {
      allTokens.push(USDCV_FAKE_TOKEN);
    }

    // Separate priority tokens from the rest
    const priorityTokens: EarnTokenDetails[] = [];
    const remainingTokens: EarnTokenDetails[] = [];

    for (const token of allTokens) {
      if (token.isETH && !token.isStaked && !isPooledStakingEnabled) {
        continue;
      }
      if (!token?.chainId) continue;

      const priorityIndex = getPriorityIndex(token);
      if (priorityIndex >= 0) {
        priorityTokens.push(token);
      } else {
        remainingTokens.push(token);
      }
    }

    // Sort priority tokens by their hardcoded order
    priorityTokens.sort((a, b) => getPriorityIndex(a) - getPriorityIndex(b));

    // Sort remaining tokens by descending balance
    const sortedRemaining = sortByHighestBalance(remainingTokens);

    return [...priorityTokens, ...sortedRemaining];
  }, [tokens, params?.onItemPressScreen, isPooledStakingEnabled]);

  const renderTokenItem = ({ item }: { item: EarnTokenDetails }) => {
    const onItemPressScreen = params?.onItemPressScreen;
    const tokenApr = getTokenApr(item);
    const formattedApr = tokenApr > 0 ? truncateNumber(tokenApr) : tokenApr;

    return (
      <View style={styles.listItemContainer}>
        {onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.WITHDRAW ? (
          <EarnWithdrawalTokenListItem
            earnToken={item}
            onPress={handleRedirectToInputScreen}
          />
        ) : (
          <EarnDepositTokenListItem
            token={item}
            onPress={handleRedirectToInputScreen}
            primaryText={{
              value: `${formattedApr}% APR`,
              color: TextColor.Success,
            }}
            {...(!isEmptyBalance(item) && {
              secondaryText: {
                value: item.balanceFormatted,
              },
            })}
          />
        )}
      </View>
    );
  };

  const renderMusdFeaturedCard = useCallback(() => {
    if (params?.onItemPressScreen !== EARN_INPUT_VIEW_ACTIONS.DEPOSIT) {
      return null;
    }

    const musdToken = earnTokens?.find(
      (t) => t.symbol === 'mUSD' || t.name === 'MetaMask USD',
    );

    return (
      <TouchableOpacity
        style={styles.musdFeaturedCard}
        onPress={() => {
          if (musdToken) {
            handleRedirectToInputScreen(musdToken);
          }
        }}
        testID="musd-featured-card"
        activeOpacity={0.7}
      >
        <View style={styles.musdFeaturedLeft}>
          <AvatarToken
            name={MUSD_TOKEN.symbol}
            imageSource={MUSD_TOKEN.imageSource}
            size={AvatarSize.Md}
          />
          <View style={styles.musdFeaturedInfo}>
            <Text variant={TextVariant.BodyMDMedium}>{MUSD_TOKEN.symbol}</Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              Cash Account
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Success}>
              Earn automatically
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.musdGetButton}
          onPress={() => {
            if (musdToken) {
              handleRedirectToInputScreen(musdToken);
            }
          }}
        >
          <Text
            variant={TextVariant.BodySMMedium}
            style={styles.musdGetButtonText}
          >
            Get mUSD
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [
    params?.onItemPressScreen,
    earnTokens,
    styles,
    handleRedirectToInputScreen,
  ]);

  const renderHeader = useCallback(() => {
    if (
      !earnTokens?.length ||
      params?.onItemPressScreen !== EARN_INPUT_VIEW_ACTIONS.DEPOSIT
    ) {
      return null;
    }

    return (
      <View>
        <UpsellBanner
          primaryText={strings('stake.you_could_earn_up_to')}
          secondaryText={
            isNoEarnableTokensWithBalance
              ? `${highestAvailableApr.toString()}%`
              : `${earnableTotalFiatFormatted}`
          }
          tertiaryText={strings('stake.per_year_on_your_tokens')}
          variant={UPSELL_BANNER_VARIANTS.HEADER}
        />
        {renderMusdFeaturedCard()}
      </View>
    );
  }, [
    earnTokens?.length,
    params?.onItemPressScreen,
    isNoEarnableTokensWithBalance,
    highestAvailableApr,
    earnableTotalFiatFormatted,
    renderMusdFeaturedCard,
  ]);

  const renderEmpty = useCallback(() => {
    if (earnTokens?.length) {
      return null;
    }
    return <EarnTokenListSkeletonPlaceholder />;
  }, [earnTokens?.length]);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderCompactStandard
        title={
          params?.onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.WITHDRAW
            ? strings('stake.select_a_token_to_withdraw')
            : strings('stake.select_a_token_to_deposit')
        }
        onBack={handleGoBack}
        includesTopInset
      />
      <View style={styles.flatList}>
        <FlatList
          data={filteredTokens}
          renderItem={renderTokenItem}
          keyExtractor={(item) => `${item.name}-${item.symbol}-${item.chainId}`}
          keyboardShouldPersistTaps="always"
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          scrollEnabled
          showsVerticalScrollIndicator
          bounces
        />
      </View>
    </SafeAreaView>
  );
};

/**
 * Temporary wrapper to prevent rendering if feature flags aren't enabled.
 */
const EarnTokenListWrapper = () => {
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  if (isStablecoinLendingEnabled) {
    return <EarnTokenList />;
  }

  return <></>;
};

export default EarnTokenListWrapper;
