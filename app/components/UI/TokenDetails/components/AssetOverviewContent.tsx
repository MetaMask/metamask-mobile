import React, { useCallback, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Theme } from '@metamask/design-tokens';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import DSText, {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Text from '../../../Base/Text';
import AppConstants from '../../../../core/AppConstants';
import Routes from '../../../../constants/navigation/Routes';
import { createWebviewNavDetails } from '../../../Views/SimpleWebview';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import {
  TimePeriod,
  TokenPrice,
} from '../../../hooks/useTokenHistoricalPrices';
import { TokenI } from '../../Tokens/types';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import { usePerpsPositionForAsset } from '../../Perps/hooks/usePerpsPositionForAsset';
import { PERPS_EVENT_VALUE } from '../../Perps/constants/eventNames';
import PerpsPositionCard from '../../Perps/components/PerpsPositionCard';
import Price from '../../AssetOverview/Price';
import ChartNavigationButton from '../../AssetOverview/ChartNavigationButton';
import Balance from '../../AssetOverview/Balance';
import TokenDetails from '../../AssetOverview/TokenDetails';
import { PriceChartProvider } from '../../AssetOverview/PriceChart/PriceChart.context';
import AssetDetailsActions from '../../../Views/AssetDetails/AssetDetailsActions';
import MerklRewards from '../../Earn/components/MerklRewards';
import PerpsDiscoveryBanner from '../../Perps/components/PerpsDiscoveryBanner';
import { isTokenTrustworthyForPerps } from '../../Perps/constants/perpsConfig';
import { useScrollToMerklRewards } from '../../AssetOverview/hooks/useScrollToMerklRewards';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronEnergyBandwidthDetail from '../../AssetOverview/TronEnergyBandwidthDetail/TronEnergyBandwidthDetail';
///: END:ONLY_INCLUDE_IF

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;
  return StyleSheet.create({
    wrapper: {
      paddingTop: 20,
    } as ViewStyle,
    warningWrapper: {
      paddingHorizontal: 16,
      marginBottom: 20,
    } as ViewStyle,
    warning: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
      padding: 20,
    } as TextStyle,
    warningLinks: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.primary.default,
    } as TextStyle,
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
    perpsPositionHeader: {
      paddingHorizontal: 16,
      paddingTop: 24,
    } as ViewStyle,
    perpsPositionCardContainer: {
      paddingHorizontal: 16,
      paddingTop: 8,
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

  // Time period
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  chartNavigationButtons: TimePeriod[];

  // Feature flags
  isPerpsEnabled: boolean;
  isMerklCampaignClaimingEnabled: boolean;

  // Display flags
  displayBuyButton: boolean;
  displaySwapsButton: boolean;
  isTokenBuyable: boolean;

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
  isMerklCampaignClaimingEnabled,
  displayBuyButton,
  displaySwapsButton,
  isTokenBuyable,
  currentCurrency,
  onBuy,
  onSend,
  onReceive,
  goToSwaps,
  isTronNative,
  stakedTrxAsset,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const merklRewardsRef = useRef<View>(null);
  const merklRewardsYInHeaderRef = useRef<number | null>(null);
  const chainId = token.chainId;

  useScrollToMerklRewards(merklRewardsYInHeaderRef);

  const { hasPerpsMarket, marketData } = usePerpsMarketForAsset(
    isPerpsEnabled ? token.symbol : null,
  );

  // Check if user has a position for this asset (only if perps is enabled and market exists)
  const { position: perpsPosition } = usePerpsPositionForAsset(
    isPerpsEnabled && hasPerpsMarket ? token.symbol : null,
  );

  const isTokenTrustworthy = isTokenTrustworthyForPerps(token);

  const goToBrowserUrl = (url: string) => {
    const [screen, params] = createWebviewNavDetails({
      url,
    });
    navigation.navigate(screen, params as Record<string, unknown>);
  };

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
        <Text style={styles.warning}>
          {strings('asset_overview.were_unable')} {token.symbol}{' '}
          {strings('asset_overview.balance')}{' '}
          <Text style={styles.warningLinks}>
            {strings('asset_overview.troubleshooting_missing')}
          </Text>{' '}
          {strings('asset_overview.for_help')}
        </Text>
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

  return (
    <View style={styles.wrapper} testID={TokenOverviewSelectorsIDs.CONTAINER}>
      {token.hasBalanceError ? (
        renderWarning()
      ) : (
        <View>
          <PriceChartProvider>
            <Price
              asset={token}
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
          <AssetDetailsActions
            displayBuyButton={displayBuyButton && isTokenBuyable}
            displaySwapsButton={displaySwapsButton}
            goToSwaps={goToSwaps}
            onBuy={onBuy}
            onReceive={onReceive}
            onSend={onSend}
            asset={{
              address: token.address,
              chainId,
            }}
          />
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
          {isMerklCampaignClaimingEnabled && (
            <View
              ref={merklRewardsRef}
              testID="merkl-rewards-section"
              onLayout={(event) => {
                // Store Y position relative to header (which is the scroll offset)
                // This is more reliable than measureInWindow for FlatList scrolling
                const { y } = event.nativeEvent.layout;
                merklRewardsYInHeaderRef.current = y;
              }}
            >
              <MerklRewards asset={token} />
            </View>
          )}
          {isPerpsEnabled &&
            hasPerpsMarket &&
            marketData &&
            isTokenTrustworthy && (
              <>
                <View style={styles.perpsPositionHeader}>
                  <DSText variant={TextVariant.HeadingMD}>
                    {strings('asset_overview.perps_position')}
                  </DSText>
                </View>
                {perpsPosition ? (
                  <TouchableOpacity
                    style={styles.perpsPositionCardContainer}
                    onPress={handlePerpsDiscoveryPress}
                    testID={TokenOverviewSelectorsIDs.PERPS_POSITION_CARD}
                    activeOpacity={0.8}
                  >
                    <PerpsPositionCard
                      position={perpsPosition}
                      currentPrice={currentPrice}
                    />
                  </TouchableOpacity>
                ) : (
                  <PerpsDiscoveryBanner
                    symbol={marketData.symbol}
                    maxLeverage={marketData.maxLeverage}
                    onPress={handlePerpsDiscoveryPress}
                    testID={TokenOverviewSelectorsIDs.PERPS_DISCOVERY_BANNER}
                  />
                )}
              </>
            )}
          <View style={styles.tokenDetailsWrapper}>
            <TokenDetails asset={token} />
          </View>
        </View>
      )}
    </View>
  );
};

export default AssetOverviewContent;
