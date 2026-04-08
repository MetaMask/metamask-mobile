import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TouchableOpacity,
  View,
  Modal,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { Theme } from '@metamask/design-tokens';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import AppConstants from '../../../../core/AppConstants';
import Routes from '../../../../constants/navigation/Routes';
import { createWebviewNavDetails } from '../../../Views/SimpleWebview';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import {
  TimePeriod,
  TokenPrice,
} from '../../../hooks/useTokenHistoricalPrices';
import { TokenI } from '../../Tokens/types';
import { usePerpsActions } from '../hooks/usePerpsActions';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { usePerpsPositionForAsset } from '../../Perps/hooks/usePerpsPositionForAsset';
import { selectPerpsEligibility } from '../../Perps/selectors/perpsController';
import { useComplianceGate } from '../../Compliance';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import PerpsBottomSheetTooltip from '../../Perps/components/PerpsBottomSheetTooltip';
import { usePerpsEventTracking } from '../../Perps/hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import PerpsPositionCard from '../../Perps/components/PerpsPositionCard';
import Price from '../../AssetOverview/Price';
import ChartNavigationButton from '../../AssetOverview/ChartNavigationButton';
import Balance from '../../AssetOverview/Balance';
import TokenDetails from '../../AssetOverview/TokenDetails';
import { PriceChartProvider } from '../../AssetOverview/PriceChart/PriceChart.context';
import AssetDetailsActions from '../../../Views/AssetDetails/AssetDetailsActions';
import { TokenDetailsActions } from './TokenDetailsActions';
import AssetOverviewClaimBonus from '../../Earn/components/AssetOverviewClaimBonus';
import { isTokenEligibleForMerklRewards } from '../../Earn/components/MerklRewards/hooks/useMerklRewards';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
import PerpsDiscoveryBanner from '../../Perps/components/PerpsDiscoveryBanner';
import { isTokenTrustworthyForPerps } from '../../Perps/constants/perpsConfig';
import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
import { selectTokenOverviewAdvancedChartEnabled } from '../../../../selectors/featureFlagController/tokenOverviewAdvancedChart';
import useTokenBuyability from '../../Ramp/hooks/useTokenBuyability';
import {
  MarketInsightsEntryCard,
  MarketInsightsEntryCardSkeleton,
  useMarketInsights,
  selectMarketInsightsEnabled,
} from '../../MarketInsights';
import { isCaipAssetType, type CaipChainId, type Hex } from '@metamask/utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import SecurityTrustEntryCard from '../../SecurityTrust/components/SecurityTrustEntryCard/SecurityTrustEntryCard';
import type { TokenDetailsRouteParams } from '../constants/constants';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
  IconName,
  IconSize,
  IconColor,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import AssetLogo from '../../Assets/components/AssetLogo/AssetLogo';
import { NetworkBadgeSource } from '../../AssetOverview/Balance/Balance';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronEnergyBandwidthDetail from '../../AssetOverview/TronEnergyBandwidthDetail/TronEnergyBandwidthDetail';
import TronUnstakingBanner from '../../Earn/components/Tron/TronUnstakingBanner/TronUnstakingBanner';
import TronUnstakedBanner from '../../Earn/components/Tron/TronUnstakedBanner/TronUnstakedBanner';
import TronStakingButtons from '../../Earn/components/Tron/TronStakingButtons/TronStakingButtons';
import TronStakingCta from '../../Earn/components/Tron/TronStakingCta/TronStakingCta';
import useTronStakeApy from '../../Earn/hooks/useTronStakeApy';
///: END:ONLY_INCLUDE_IF
import MarketClosedActionButton from '../../AssetOverview/MarketClosedActionButton';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';
import StockBadge from '../../shared/StockBadge/StockBadge';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    warningWrapper: {
      paddingHorizontal: 16,
      marginBottom: 20,
    } as ViewStyle,
    warning: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
      padding: 20,
    } as ViewStyle,
    chartNavigationWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 10,
      paddingTop: 20,
      marginBottom: 16,
    } as ViewStyle,
    tokenDetailsWrapper: {
      marginBottom: 20,
      paddingHorizontal: 16,
    } as ViewStyle,
    marketInsightsWrapper: {
      paddingTop: 16,
    } as ViewStyle,
    perpsPositionCardContainer: {
      paddingHorizontal: 16,
      paddingTop: 24,
    } as ViewStyle,
    marketClosedActionButtonContainer: {
      marginBottom: 8,
    },
    securityTrustWrapper: {
      marginTop: 20,
      marginBottom: 20,
      paddingHorizontal: 16,
    } as ViewStyle,
  });
};

export interface AssetOverviewContentProps {
  // Asset
  token: TokenI;

  // Balance data
  balance: string | number | undefined;
  mainBalance: string;
  secondaryBalance: string | undefined;

  // Price data
  currentPrice: number;
  priceDiff: number;
  comparePrice: number;
  prices: TokenPrice[];
  isLoading: boolean;

  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  chartNavigationButtons: TimePeriod[];

  // Feature flags
  isPerpsEnabled: boolean;

  // Display flags
  displayBuyButton: boolean;
  displaySwapsButton: boolean;

  // Currency
  currentCurrency: string;

  // Actions
  onBuy: () => void;
  onSend: () => Promise<void>;
  onReceive: () => void;
  goToSwaps: () => void;

  // Tron-specific
  isTronNative?: boolean;
  stakedTrxAsset?: TokenI;
  inLockPeriodBalance?: string;
  readyForWithdrawalBalance?: string;
  /**
   * Stable callback from TokenDetails route wrapper. Payload includes
   * `severity` from `securityData?.resultType` so the parent callback identity
   * does not change when security loads (avoids market-insights effect loops).
   */
  onMarketInsightsDisplayResolved?: (params: {
    isDisplayed: boolean;
    severity: string | undefined;
  }) => void;
  onMarketInsightsDisclaimerPress?: () => void;

  // Security & Trust
  /** Resolved security data owned by the parent (TokenDetails). */
  securityData?: TokenSecurityData | null;
  /** Whether security data is still being fetched. */
  isSecurityDataLoading?: boolean;
  /** Whether the security data fetch failed. Hides the card when true. */
  hasSecurityDataError?: boolean;
}

/**
 * AssetOverviewContent composes all UI sections for the token details view.
 * This component receives all data via props and renders:
 * - Price section with chart
 * - Chart navigation buttons
 * - Action buttons (Buy, Swap, Send, Receive)
 * - Balance display
 * - Merkl rewards section
 * - Perps discovery banner
 * - Token details (contract, decimals, etc.)
 */
const AssetOverviewContent: React.FC<AssetOverviewContentProps> = ({
  token,
  balance,
  mainBalance,
  secondaryBalance,
  currentPrice,
  priceDiff,
  comparePrice,
  prices,
  isLoading,
  timePeriod,
  setTimePeriod,
  chartNavigationButtons,
  isPerpsEnabled,
  displayBuyButton,
  displaySwapsButton,
  currentCurrency,
  onBuy,
  onSend,
  onReceive,
  goToSwaps,
  isTronNative,
  stakedTrxAsset,
  inLockPeriodBalance,
  readyForWithdrawalBalance,
  onMarketInsightsDisplayResolved,
  onMarketInsightsDisclaimerPress,
  securityData,
  isSecurityDataLoading = false,
  hasSecurityDataError = false,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const resetNavigationLockRef = useRef<(() => void) | null>(null);
  const { isTokenTradingOpen, isStockToken } = useRWAToken();
  const { trackEvent, createEventBuilder } = useAnalytics();

  // A/B test hook for layout selection (must be called before usePerpsActions to pass ab_tests)
  const { useNewLayout, isTestActive, variantName } = useTokenDetailsABTest();
  const isTokenOverviewAdvancedChartEnabled = useSelector(
    selectTokenOverviewAdvancedChartEnabled,
  );
  const {
    hasPerpsMarket,
    marketData,
    isLoading: isPerpsLoading,
    handlePerpsAction,
  } = usePerpsActions({
    symbol: isPerpsEnabled ? token.symbol : null,
    fromTokenDetails: true,
    abTestTokenDetailsLayout: isTestActive ? variantName : undefined,
  });

  const isEligible = useSelector(selectPerpsEligibility);
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);
  const { track } = usePerpsEventTracking();

  // Compliance gate
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');

  const closeEligibilityModal = useCallback(() => {
    setIsEligibilityModalVisible(false);
    resetNavigationLockRef.current?.();
  }, []);

  const handleLongPress = useCallback(
    () =>
      gate(async () => {
        if (!isEligible) {
          track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
            [PERPS_EVENT_PROPERTY.SOURCE]:
              PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
          });
          setIsEligibilityModalVisible(true);
          return;
        }
        handlePerpsAction?.('long');
      }),
    [gate, isEligible, track, handlePerpsAction],
  );

  const handleShortPress = useCallback(
    () =>
      gate(async () => {
        if (!isEligible) {
          track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
            [PERPS_EVENT_PROPERTY.SOURCE]:
              PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
          });
          setIsEligibilityModalVisible(true);
          return;
        }
        handlePerpsAction?.('short');
      }),
    [gate, isEligible, track, handlePerpsAction],
  );

  const { isBuyable, isLoading: isBuyableLoading } = useTokenBuyability(token);

  const isButtonsLoading = isBuyableLoading || isPerpsLoading;

  // Check if user has a position for this asset (only if perps is enabled and market exists)
  const { position: perpsPosition, isLoading: isPerpsPositionLoading } =
    usePerpsPositionForAsset(
      isPerpsEnabled && hasPerpsMarket ? token.symbol : null,
    );

  const isTokenTrustworthy = isTokenTrustworthyForPerps(token);

  const showPerpsSection =
    isPerpsEnabled &&
    hasPerpsMarket &&
    Boolean(marketData) &&
    isTokenTrustworthy &&
    !isPerpsPositionLoading;

  const isMarketInsightsEnabled = useSelector(selectMarketInsightsEnabled);

  const isMerklClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );
  const isTokenEligibleForMerklClaim = useMemo(
    () =>
      isMerklClaimingEnabled &&
      isTokenEligibleForMerklRewards(
        token.chainId as Hex,
        token.address as Hex | undefined,
      ),
    [isMerklClaimingEnabled, token.chainId, token.address],
  );

  const securityBadge = useMemo(() => {
    switch (securityData?.resultType) {
      case 'Verified':
        return {
          icon: IconName.VerifiedFilled,
          iconColor: IconColor.IconDefault,
          label: null,
          bg: null,
          textColor: undefined,
        };
      case 'Benign':
        return null;
      case 'Warning':
      case 'Spam':
        return {
          icon: IconName.Warning,
          iconColor: IconColor.WarningDefault,
          label: strings('security_trust.risky'),
          bg: 'bg-warning-muted',
          textColor: TextColor.WarningDefault,
        };
      case 'Malicious':
        return {
          icon: IconName.Danger,
          iconColor: IconColor.ErrorDefault,
          label: strings('security_trust.malicious'),
          bg: 'bg-error-muted',
          textColor: TextColor.ErrorDefault,
        };
      default:
        return null;
    }
  }, [securityData?.resultType]);

  const handleSecurityBadgePress = useCallback(() => {
    if (!securityData?.resultType || securityData.resultType === 'Benign')
      return;

    const configMap: Record<
      string,
      {
        icon: IconName;
        iconColor: IconColor;
        title: string;
        description: string;
      }
    > = {
      Verified: {
        icon: IconName.VerifiedFilled,
        iconColor: IconColor.IconDefault,
        title: strings('security_trust.verified_token_title'),
        description: strings('security_trust.verified_token_description', {
          symbol: token.symbol,
        }),
      },
      Warning: {
        icon: IconName.Warning,
        iconColor: IconColor.WarningDefault,
        title: strings('security_trust.risky_token_title'),
        description: strings('security_trust.risky_token_description', {
          symbol: token.symbol,
        }),
      },
      Spam: {
        icon: IconName.Warning,
        iconColor: IconColor.WarningDefault,
        title: strings('security_trust.risky_token_title'),
        description: strings('security_trust.risky_token_description', {
          symbol: token.symbol,
        }),
      },
      Malicious: {
        icon: IconName.Danger,
        iconColor: IconColor.ErrorDefault,
        title: strings('security_trust.malicious_token_title'),
        description: strings(
          'security_trust.malicious_token_sheet_description',
          { symbol: token.symbol },
        ),
      },
    };

    const config = configMap[securityData.resultType];
    if (config) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: {
          ...config,
          source: 'badge',
          severity: securityData.resultType,
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          chainId: token.chainId,
        },
      });
    }
  }, [
    securityData?.resultType,
    token.symbol,
    token.address,
    token.chainId,
    navigation,
  ]);

  const networkBadgeSource = token.chainId
    ? NetworkBadgeSource(token.chainId as Hex)
    : undefined;

  const marketInsightsCaip19Id = useMemo(() => {
    if (!isMarketInsightsEnabled) {
      return null;
    }

    try {
      if (isCaipAssetType(token.address)) {
        return token.address;
      }

      if (!token.chainId) {
        return null;
      }

      return formatAddressToAssetId(token.address, token.chainId) ?? null;
    } catch {
      return null;
    }
  }, [isMarketInsightsEnabled, token.address, token.chainId]);
  const {
    report: marketInsightsReport,
    timeAgo: marketInsightsTimeAgo,
    isLoading: isMarketInsightsLoading,
  } = useMarketInsights(marketInsightsCaip19Id, isMarketInsightsEnabled);

  useEffect(() => {
    const severity = securityData?.resultType;
    if (!isMarketInsightsEnabled) {
      onMarketInsightsDisplayResolved?.({ isDisplayed: false, severity });
      return;
    }
    if (isMarketInsightsLoading) {
      return;
    }
    if (!marketInsightsReport && marketInsightsCaip19Id) {
      // No report available — cancel the orphaned trace that was started during render
      endTrace({
        name: TraceName.MarketInsightsEntryCardLoad,
        id: marketInsightsCaip19Id,
      });
    }
    onMarketInsightsDisplayResolved?.({
      isDisplayed: Boolean(marketInsightsReport),
      severity,
    });
  }, [
    onMarketInsightsDisplayResolved,
    isMarketInsightsEnabled,
    isMarketInsightsLoading,
    marketInsightsReport,
    marketInsightsCaip19Id,
    securityData?.resultType,
  ]);

  // Start the entry card trace synchronously during render so it is registered
  // in the trace map before any child useEffect (where endTrace fires) runs.
  // Using a ref guard ensures we only start one trace per unique asset.
  const entryCardTraceStartedRef = useRef<string | null>(null);
  if (
    isMarketInsightsEnabled &&
    marketInsightsCaip19Id &&
    entryCardTraceStartedRef.current !== marketInsightsCaip19Id
  ) {
    entryCardTraceStartedRef.current = marketInsightsCaip19Id;
    trace({
      name: TraceName.MarketInsightsEntryCardLoad,
      op: TraceOperation.MarketInsightsLoad,
      id: marketInsightsCaip19Id,
    });
  }

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const { apyPercent: tronApyPercent } = useTronStakeApy();
  ///: END:ONLY_INCLUDE_IF

  const goToBrowserUrl = (url: string) => {
    const [screen, params] = createWebviewNavDetails({
      url,
    });
    navigation.navigate(screen, params as Record<string, unknown>);
  };

  const handleMarketInsightsPress = useCallback(() => {
    if (marketInsightsCaip19Id) {
      trace({
        name: TraceName.MarketInsightsViewLoad,
        op: TraceOperation.MarketInsightsLoad,
      });
      const event = createEventBuilder(MetaMetricsEvents.MARKET_INSIGHTS_OPENED)
        .addProperties({
          caip19: marketInsightsCaip19Id,
          ...(marketInsightsReport && {
            asset_symbol: marketInsightsReport.asset,
            digest_id: marketInsightsReport.digestId,
          }),
        })
        .build();
      trackEvent(event);
    }

    // Compute actual percentage from available price data (always defined)
    const percentChange =
      comparePrice > 0 ? (priceDiff / comparePrice) * 100 : 0;

    navigation.navigate(Routes.MARKET_INSIGHTS.VIEW, {
      assetSymbol: token.symbol,
      assetIdentifier: marketInsightsCaip19Id,
      tokenImageUrl: token.image || token.logo,
      pricePercentChange: percentChange,
      // Pass token data needed for swap navigation
      tokenAddress: token.address,
      tokenDecimals: token.decimals,
      tokenName: token.name,
      tokenChainId: token.chainId,
    });
  }, [
    navigation,
    trackEvent,
    createEventBuilder,
    token.symbol,
    marketInsightsCaip19Id,
    marketInsightsReport,
    token.image,
    token.logo,
    token.address,
    token.decimals,
    token.name,
    token.chainId,
    priceDiff,
    comparePrice,
  ]);

  const handlePerpsDiscoveryPress = useCallback(() => {
    if (marketData) {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: marketData,
          source: PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
        },
      });
    }
  }, [marketData, navigation]);

  const handleSelectTimePeriod = useCallback(
    (period: TimePeriod) => {
      setTimePeriod(period);
    },
    [setTimePeriod],
  );

  const renderChartNavigationButton = useCallback(
    () =>
      chartNavigationButtons.map((label) => (
        <ChartNavigationButton
          key={label}
          label={strings(
            `asset_overview.chart_time_period_navigation.${label}`,
          )}
          onPress={() => handleSelectTimePeriod(label)}
          selected={timePeriod === label}
        />
      )),
    [handleSelectTimePeriod, timePeriod, chartNavigationButtons],
  );

  const renderWarning = () => (
    <View style={styles.warningWrapper}>
      <TouchableOpacity
        onPress={() => goToBrowserUrl(AppConstants.URLS.TOKEN_BALANCE)}
      >
        <View style={styles.warning}>
          <Text variant={TextVariant.BodyMd}>
            {strings('asset_overview.were_unable')} {token.symbol}{' '}
            {strings('asset_overview.balance')}{' '}
            <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryDefault}>
              {strings('asset_overview.troubleshooting_missing')}
            </Text>{' '}
            {strings('asset_overview.for_help')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const handleMarketClosedButtonPress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
    });
  };

  const shouldShowMarketInsights =
    isMarketInsightsEnabled &&
    Boolean(marketInsightsCaip19Id) &&
    (Boolean(marketInsightsReport) || isMarketInsightsLoading);

  return (
    <Box twClassName="pt-[2px]" testID={TokenOverviewSelectorsIDs.CONTAINER}>
      {token.hasBalanceError ? (
        renderWarning()
      ) : (
        <View>
          {/* Token icon + name row */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-4 py-2 pl-4 pr-[16px]"
          >
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                networkBadgeSource ? (
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={networkBadgeSource}
                    size={AvatarSize.Xs}
                  />
                ) : undefined
              }
            >
              <AssetLogo asset={token} />
            </BadgeWrapper>

            <Box twClassName="min-w-0 flex-1">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="max-w-full min-w-0 gap-1.5 self-stretch"
              >
                <Box twClassName="min-w-0 shrink grow-0">
                  <Text
                    variant={TextVariant.HeadingMd}
                    color={TextColor.TextDefault}
                    numberOfLines={1}
                  >
                    {token.name || token.symbol}
                  </Text>
                </Box>
                {securityBadge && securityBadge.label === null && (
                  <Box twClassName="shrink-0">
                    <TouchableOpacity
                      onPress={handleSecurityBadgePress}
                      testID="security-badge-verified"
                    >
                      <Icon
                        name={securityBadge.icon}
                        size={IconSize.Md}
                        color={securityBadge.iconColor}
                      />
                    </TouchableOpacity>
                  </Box>
                )}
                {securityBadge && securityBadge.label !== null && (
                  <Box twClassName="shrink-0">
                    <TouchableOpacity
                      onPress={handleSecurityBadgePress}
                      testID={
                        securityData?.resultType === 'Malicious'
                          ? 'security-badge-malicious'
                          : 'security-badge-warning'
                      }
                    >
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        twClassName={`rounded min-w-[22px] px-1.5 gap-1 ${securityBadge.bg}`}
                      >
                        <Icon
                          name={securityBadge.icon}
                          size={IconSize.Sm}
                          color={securityBadge.iconColor}
                        />
                        <Text
                          variant={TextVariant.BodySm}
                          color={securityBadge.textColor}
                          fontWeight={FontWeight.Medium}
                          numberOfLines={1}
                          twClassName="overflow-hidden text-center"
                        >
                          {securityBadge.label}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  </Box>
                )}
                {!token.name && isStockToken(token as BridgeToken) && (
                  <Box twClassName="shrink-0">
                    <StockBadge token={token as BridgeToken} />
                  </Box>
                )}
              </Box>
              {token.name ? (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                  >
                    {token.ticker || token.symbol}
                  </Text>
                  {isStockToken(token as BridgeToken) && (
                    <StockBadge token={token as BridgeToken} />
                  )}
                </Box>
              ) : null}
            </Box>
          </Box>

          {securityData?.resultType === 'Malicious' && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              twClassName="self-stretch mx-4 mt-3 min-h-[100px] min-w-[280px] py-3 pl-6 pr-4 gap-4 rounded-2xl bg-error-muted"
            >
              <Box twClassName="pt-[2px]">
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Md}
                  color={IconColor.ErrorDefault}
                />
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Column}
                alignItems={BoxAlignItems.Start}
                twClassName="flex-1"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  fontWeight={FontWeight.Bold}
                >
                  {strings('security_trust.malicious_token_title')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {strings('security_trust.malicious_token_description', {
                    symbol: token.symbol,
                  })}
                </Text>
              </Box>
            </Box>
          )}

          <PriceChartProvider>
            <Price
              asset={token}
              prices={prices}
              timePeriod={timePeriod}
              priceDiff={priceDiff}
              currentCurrency={currentCurrency}
              currentPrice={currentPrice}
              comparePrice={comparePrice}
              isLoading={isLoading}
            />
          </PriceChartProvider>
          {/* Same as main: chart period tabs under the legacy line chart. Omitted when the advanced chart is on (range selector lives inside Price). */}
          {!isTokenOverviewAdvancedChartEnabled && (
            <View style={styles.chartNavigationWrapper}>
              {renderChartNavigationButton()}
            </View>
          )}
          {!isTokenTradingOpen(token as BridgeToken) && (
            <View style={styles.marketClosedActionButtonContainer}>
              <MarketClosedActionButton
                iconName={ComponentLibraryIconName.Info}
                label={strings('asset_overview.market_closed')}
                onPress={handleMarketClosedButtonPress}
              />
            </View>
          )}
          {useNewLayout ? (
            <TokenDetailsActions
              hasPerpsMarket={hasPerpsMarket}
              hasBalance={Boolean(balance) && balance !== '0'}
              isBuyable={isBuyable}
              isNativeCurrency={token.isETH || token.isNative || false}
              token={token}
              onBuy={onBuy}
              onLong={handlePerpsAction ? handleLongPress : undefined}
              onShort={handlePerpsAction ? handleShortPress : undefined}
              onSend={onSend}
              onReceive={onReceive}
              isLoading={isButtonsLoading}
              resetNavigationLockRef={resetNavigationLockRef}
            />
          ) : (
            <AssetDetailsActions
              displayBuyButton={displayBuyButton && isBuyable}
              displaySwapsButton={
                displaySwapsButton && isTokenTradingOpen(token as BridgeToken)
              }
              goToSwaps={goToSwaps}
              onBuy={onBuy}
              onReceive={onReceive}
              onSend={onSend}
              asset={{
                address: token.address,
                chainId: token.chainId,
              }}
            />
          )}
          {shouldShowMarketInsights ? (
            <View style={styles.marketInsightsWrapper}>
              {marketInsightsReport ? (
                <MarketInsightsEntryCard
                  report={marketInsightsReport}
                  timeAgo={marketInsightsTimeAgo}
                  onPress={handleMarketInsightsPress}
                  onDisclaimerPress={onMarketInsightsDisclaimerPress}
                  caip19Id={marketInsightsCaip19Id ?? undefined}
                  testID="market-insights-entry-card"
                />
              ) : (
                <MarketInsightsEntryCardSkeleton />
              )}
            </View>
          ) : null}
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && <TronEnergyBandwidthDetail />
            ///: END:ONLY_INCLUDE_IF
          }
          {balance != null && (
            <Balance
              asset={token}
              mainBalance={mainBalance}
              secondaryBalance={secondaryBalance}
            />
          )}
          {isTokenEligibleForMerklClaim && (
            <AssetOverviewClaimBonus asset={token} />
          )}
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && stakedTrxAsset && (
              <Balance
                asset={stakedTrxAsset}
                mainBalance={stakedTrxAsset.balance ?? ''}
                secondaryBalance={`${stakedTrxAsset.balance} ${stakedTrxAsset.symbol}`}
                hideTitleHeading
                hidePercentageChange
              />
            )
            ///: END:ONLY_INCLUDE_IF
          }
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && readyForWithdrawalBalance && (
              <Box paddingTop={3} paddingHorizontal={4}>
                <TronUnstakedBanner
                  amount={readyForWithdrawalBalance}
                  chainId={String(token.chainId) as CaipChainId}
                />
              </Box>
            )
            ///: END:ONLY_INCLUDE_IF
          }
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && inLockPeriodBalance && (
              <Box paddingTop={3} paddingHorizontal={4}>
                <TronUnstakingBanner amount={inLockPeriodBalance} />
              </Box>
            )
            ///: END:ONLY_INCLUDE_IF
          }
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && stakedTrxAsset && (
              <Box paddingTop={4} paddingHorizontal={4}>
                <TronStakingButtons asset={stakedTrxAsset} />
              </Box>
            )
            ///: END:ONLY_INCLUDE_IF
          }
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            isTronNative && !stakedTrxAsset && (
              <Box paddingTop={3} paddingHorizontal={4}>
                <TronStakingCta
                  asset={token}
                  aprText={tronApyPercent ?? undefined}
                />
              </Box>
            )
            ///: END:ONLY_INCLUDE_IF
          }
          {showPerpsSection && perpsPosition && (
            <View style={styles.perpsPositionCardContainer}>
              <Text variant={TextVariant.HeadingMd} twClassName="mb-2">
                {strings('asset_overview.perps_position')}
              </Text>
              <PerpsPositionCard
                position={perpsPosition}
                compact
                onPress={handlePerpsDiscoveryPress}
                testID={TokenOverviewSelectorsIDs.PERPS_POSITION_CARD}
              />
            </View>
          )}
          {showPerpsSection && !perpsPosition && marketData && (
            <PerpsDiscoveryBanner
              symbol={marketData.symbol}
              maxLeverage={marketData.maxLeverage}
              onPress={handlePerpsDiscoveryPress}
              testID={TokenOverviewSelectorsIDs.PERPS_DISCOVERY_BANNER}
            />
          )}
          <View style={styles.tokenDetailsWrapper}>
            <TokenDetails asset={token} />
          </View>
          {!hasSecurityDataError &&
            (isSecurityDataLoading || securityData?.resultType) && (
              <View style={styles.securityTrustWrapper}>
                <SecurityTrustEntryCard
                  securityData={securityData ?? null}
                  isLoading={isSecurityDataLoading}
                  token={token as TokenDetailsRouteParams}
                />
              </View>
            )}
          {isEligibilityModalVisible && (
            <View>
              <Modal
                visible
                transparent
                animationType="none"
                statusBarTranslucent
              >
                <PerpsBottomSheetTooltip
                  isVisible
                  onClose={closeEligibilityModal}
                  contentKey="geo_block"
                  testID="token-details-geo-block-tooltip"
                />
              </Modal>
            </View>
          )}
        </View>
      )}
    </Box>
  );
};

export default AssetOverviewContent;
