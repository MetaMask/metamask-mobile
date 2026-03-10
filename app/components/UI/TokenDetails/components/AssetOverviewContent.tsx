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
  TextStyle,
  ViewStyle,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { Theme } from '@metamask/design-tokens';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
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
import PerpsDiscoveryBanner from '../../Perps/components/PerpsDiscoveryBanner';
import { isTokenTrustworthyForPerps } from '../../Perps/constants/perpsConfig';
import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
import useTokenBuyability from '../../Ramp/hooks/useTokenBuyability';
import {
  MarketInsightsEntryCard,
  useMarketInsights,
  selectMarketInsightsEnabled,
} from '../../MarketInsights';
import { isCaipAssetType, type CaipAssetType, type Hex } from '@metamask/utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import SecurityTrustEntryCard from '../../SecurityTrust/components/SecurityTrustEntryCard/SecurityTrustEntryCard';
import { formatRelativeTime } from '../../MarketInsights/utils/marketInsightsFormatting';
import type { TokenDetailsRouteParams } from '../constants/constants';
import {
  Box,
  Text as DSText,
  TextVariant as DSTextVariant,
  TextColor as DSTextColor,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
  IconName,
  IconSize,
  IconColor,
  FontWeight,
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
///: END:ONLY_INCLUDE_IF
import MarketClosedActionButton from '../../AssetOverview/MarketClosedActionButton';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';
import StockBadge from '../../shared/StockBadge/StockBadge';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { trace, TraceName, TraceOperation } from '../../../../util/trace';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      paddingTop: 20,
    } as ViewStyle,
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
    perpsPositionTitle: {
      marginBottom: 8,
    } as TextStyle,
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

  // Time period
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
  onMarketInsightsDisplayResolved?: (isDisplayed: boolean) => void;

  // Security & Trust
  /** Pre-fetched security data from trending/search flows. When absent the hook fetches on demand. */
  prefetchedSecurityData?: TokenSecurityData;
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
  onMarketInsightsDisplayResolved,
  prefetchedSecurityData,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const resetNavigationLockRef = useRef<(() => void) | null>(null);
  const { isTokenTradingOpen, isStockToken } = useRWAToken();
  const { trackEvent, createEventBuilder } = useAnalytics();

  // A/B test hook for layout selection (must be called before usePerpsActions to pass ab_tests)
  const { useNewLayout, isTestActive, variantName } = useTokenDetailsABTest();

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

  const closeEligibilityModal = useCallback(() => {
    setIsEligibilityModalVisible(false);
    resetNavigationLockRef.current?.();
  }, []);

  const handleLongPress = useCallback(() => {
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
  }, [isEligible, track, handlePerpsAction]);

  const handleShortPress = useCallback(() => {
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
  }, [isEligible, track, handlePerpsAction]);

  const { isBuyable, isLoading: isBuyableLoading } = useTokenBuyability(token);

  const isButtonsLoading = isBuyableLoading || isPerpsLoading;

  // Check if user has a position for this asset (only if perps is enabled and market exists)
  const { position: perpsPosition, isLoading: isPerpsPositionLoading } =
    usePerpsPositionForAsset(
      isPerpsEnabled && hasPerpsMarket ? token.symbol : null,
    );

  const isTokenTrustworthy = isTokenTrustworthyForPerps(token);

  const isMarketInsightsEnabled = useSelector(selectMarketInsightsEnabled);
  const caip19AssetId = useMemo((): CaipAssetType | null => {
    try {
      if (isCaipAssetType(token.address)) {
        return token.address as CaipAssetType;
      }
      if (!token.chainId) return null;
      return (formatAddressToAssetId(token.address, token.chainId) ??
        null) as CaipAssetType | null;
    } catch {
      return null;
    }
  }, [token.address, token.chainId]);

  const {
    securityData,
    isLoading: isSecurityLoading,
    fetchedAt: securityFetchedAt,
  } = useTokenSecurityData({
    assetId: caip19AssetId,
    prefetchedData: prefetchedSecurityData,
  });

  const securityBadge = useMemo(() => {
    switch (securityData?.resultType) {
      case 'Verified':
      case 'Benign':
        return { icon: IconName.VerifiedFilled, color: IconColor.IconDefault };
      case 'Warning':
      case 'Spam':
        return { icon: IconName.Warning, color: IconColor.WarningDefault };
      case 'Malicious':
        return { icon: IconName.Danger, color: IconColor.ErrorDefault };
      default:
        return null;
    }
  }, [securityData?.resultType]);

  const networkBadgeSource = token.chainId
    ? NetworkBadgeSource(token.chainId as Hex)
    : undefined;

  const securityTimeAgo = useMemo(
    () =>
      securityFetchedAt
        ? formatRelativeTime(securityFetchedAt.toISOString())
        : '',
    [securityFetchedAt],
  );

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
    if (!onMarketInsightsDisplayResolved) {
      return;
    }
    if (!isMarketInsightsEnabled) {
      onMarketInsightsDisplayResolved(false);
      return;
    }
    if (isMarketInsightsLoading) {
      return;
    }
    onMarketInsightsDisplayResolved(Boolean(marketInsightsReport));
  }, [
    onMarketInsightsDisplayResolved,
    isMarketInsightsEnabled,
    isMarketInsightsLoading,
    marketInsightsReport,
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
        })
        .build();
      trackEvent(event);
    }

    // Compute actual percentage from available price data (always defined)
    const percentChange =
      comparePrice > 0 ? (priceDiff / comparePrice) * 100 : 0;

    navigation.navigate(Routes.MARKET_INSIGHTS.VIEW, {
      assetSymbol: token.symbol,
      caip19Id: marketInsightsCaip19Id,
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
    (_timePeriod: TimePeriod) => {
      setTimePeriod(_timePeriod);
    },
    [setTimePeriod],
  );

  const renderWarning = () => (
    <View style={styles.warningWrapper}>
      <TouchableOpacity
        onPress={() => goToBrowserUrl(AppConstants.URLS.TOKEN_BALANCE)}
      >
        <View style={styles.warning}>
          <Text variant={TextVariant.BodyMD}>
            {strings('asset_overview.were_unable')} {token.symbol}{' '}
            {strings('asset_overview.balance')}{' '}
            <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
              {strings('asset_overview.troubleshooting_missing')}
            </Text>{' '}
            {strings('asset_overview.for_help')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
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

  const handleMarketClosedButtonPress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
    });
  };

  return (
    <View style={styles.wrapper} testID={TokenOverviewSelectorsIDs.CONTAINER}>
      {token.hasBalanceError ? (
        renderWarning()
      ) : (
        <View>
          {/* Token icon + name row */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="py-2 pl-4 pr-2 self-stretch gap-3"
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

            <Box twClassName="flex-1">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-1"
              >
                <DSText
                  variant={DSTextVariant.HeadingMd}
                  color={DSTextColor.TextDefault}
                  numberOfLines={1}
                  twClassName="shrink"
                >
                  {token.name || token.symbol}
                </DSText>
                {securityBadge && (
                  <Icon
                    name={securityBadge.icon}
                    size={IconSize.Md}
                    color={securityBadge.color}
                  />
                )}
                {!token.name && isStockToken(token as BridgeToken) && (
                  <StockBadge token={token as BridgeToken} />
                )}
              </Box>
              {token.name ? (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1"
                >
                  <DSText
                    variant={DSTextVariant.BodyMd}
                    color={DSTextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                  >
                    {token.ticker || token.symbol}
                  </DSText>
                  {isStockToken(token as BridgeToken) && (
                    <StockBadge token={token as BridgeToken} />
                  )}
                </Box>
              ) : null}
            </Box>
          </Box>

          <PriceChartProvider>
            <Price
              prices={prices}
              priceDiff={priceDiff}
              currentCurrency={currentCurrency}
              currentPrice={currentPrice}
              comparePrice={comparePrice}
              isLoading={isLoading}
              timePeriod={timePeriod}
            />
          </PriceChartProvider>
          <View style={styles.chartNavigationWrapper}>
            {renderChartNavigationButton()}
          </View>
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
              hasBalance={balance != null && Number(balance) > 0}
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
          {isMarketInsightsEnabled &&
          marketInsightsReport &&
          marketInsightsCaip19Id ? (
            <View style={styles.marketInsightsWrapper}>
              <MarketInsightsEntryCard
                report={marketInsightsReport}
                timeAgo={marketInsightsTimeAgo}
                onPress={handleMarketInsightsPress}
                caip19Id={marketInsightsCaip19Id}
                testID="market-insights-entry-card"
              />
            </View>
          ) : null}
          {isPerpsEnabled &&
            hasPerpsMarket &&
            marketData &&
            isTokenTrustworthy &&
            !isPerpsPositionLoading && (
              <>
                {perpsPosition ? (
                  <View style={styles.perpsPositionCardContainer}>
                    <Text
                      variant={TextVariant.HeadingMD}
                      style={styles.perpsPositionTitle}
                    >
                      {strings('asset_overview.perps_position')}
                    </Text>
                    <PerpsPositionCard
                      position={perpsPosition}
                      compact
                      onPress={handlePerpsDiscoveryPress}
                      testID={TokenOverviewSelectorsIDs.PERPS_POSITION_CARD}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.perpsPositionCardContainer}>
                      <Text variant={TextVariant.HeadingMD}>
                        {strings('asset_overview.perps_position')}
                      </Text>
                    </View>
                    <PerpsDiscoveryBanner
                      symbol={marketData.symbol}
                      maxLeverage={marketData.maxLeverage}
                      onPress={handlePerpsDiscoveryPress}
                      testID={TokenOverviewSelectorsIDs.PERPS_DISCOVERY_BANNER}
                    />
                  </>
                )}
              </>
            )}
          <View style={styles.tokenDetailsWrapper}>
            <TokenDetails asset={token} />
          </View>
          <View style={styles.securityTrustWrapper}>
            <SecurityTrustEntryCard
              securityData={securityData}
              isLoading={isSecurityLoading}
              timeAgo={securityTimeAgo}
              token={token as TokenDetailsRouteParams}
            />
          </View>
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
    </View>
  );
};

export default AssetOverviewContent;
