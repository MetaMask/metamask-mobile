import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { Theme } from '@metamask/design-tokens';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import AppConstants from '../../../../core/AppConstants';
import Routes from '../../../../constants/navigation/Routes';
import { createWebviewNavDetails } from '../../../Views/SimpleWebview';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import {
  TimePeriod,
  TokenPrice,
} from '../../../hooks/useTokenHistoricalPrices';
import { TokenI } from '../../Tokens/types';
import { usePerpsActions } from '../hooks/usePerpsActions';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import { usePerpsPositionForAsset } from '../../Perps/hooks/usePerpsPositionForAsset';
import PerpsCard from '../../Perps/components/PerpsCard';
import Price from '../../AssetOverview/Price';
import Balance from '../../AssetOverview/Balance';
import TokenDetails from '../../AssetOverview/TokenDetails';
import EarnBalance from '../../Earn/components/EarnBalance';
import MoneyEarnBanner from '../../Money/components/MoneyEarnBanner';
import TokenDetailsActionsSection from './sections/TokenDetailsActionsSection';
import TokenDetailsMarketInsightsSection from './sections/TokenDetailsMarketInsightsSection';
import PerpsDiscoveryBanner from '../../Perps/components/PerpsDiscoveryBanner';
import { isTokenTrustworthyForPerps } from '../../Perps/constants/perpsConfig';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import SecurityTrustEntryCard from '../../SecurityTrust/components/SecurityTrustEntryCard/SecurityTrustEntryCard';
import {
  TokenDetailsAction,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { useTokenDetailsActionTracking } from '../hooks/useTokenDetailsActionTracking';
import { useTokenSecurityBadgePress } from '../hooks/useTokenSecurityBadgePress';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { TextColor as ComponentLibraryTextColor } from '../../../../component-library/components/Texts/Text';
import { SecurityBanner } from './SecurityBanner';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronEnergyBandwidthDetail from '../../AssetOverview/TronEnergyBandwidthDetail/TronEnergyBandwidthDetail';
import TronAssetOverviewSection from './TronAssetOverviewSection';
import { isTronNativeToken } from '../utils/isTronNativeToken';
///: END:ONLY_INCLUDE_IF
import { AssetActivateCard } from '../../AssetActivation/AssetActivateCard';
import { SpendableBalanceSection } from '../../SpendableBalance/SpendableBalanceSection';
import { getIsAssetRequireActivate } from '../../../../selectors/stellar/stellar-assets';
import { useSpendableBalance } from '../hooks/useSpendableBalance';
import MarketClosedActionButton from '../../AssetOverview/MarketClosedActionButton';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken, BridgeViewMode } from '../../Bridge/types';
import type { RecurringOrder } from '../../Bridge/api/recurringOrders.types';
import { TokenDetailsOrdersSection } from './TokenDetailsOrdersSection';
import { getMostRecentOrderType } from '../utils/getMostRecentOrderType';
import { startSwapBridgePageLoadTrace } from '../../Bridge/utils/swapBridgePageLoadTrace';

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
    tokenDetailsWrapper: {
      marginBottom: 20,
      paddingHorizontal: 16,
    } as ViewStyle,
    // Owns token-details placement. No marginBottom — Balance already
    // provides paddingTop, and extra card margin was stacking under it.
    marketInsightsWrapper: {
      paddingTop: 16,
    } as ViewStyle,
    perpsPositionCardContainer: {
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
  token: TokenDetailsRouteParams;

  // Balance data
  balance: string | number | undefined;
  balanceCta?: React.ReactNode;
  balanceDescription?: React.ReactNode;
  balancePriceChangeOverride?: string;
  balancePriceChangeOverrideColor?: ComponentLibraryTextColor;
  mainBalance: string;
  secondaryBalance: string | undefined;

  // Price data
  currentPrice: number;
  priceDiff: number;
  comparePrice: number;
  prices: TokenPrice[];
  isLoading: boolean;
  hasInsufficientCoverage?: boolean;

  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  chartNavigationButtons: TimePeriod[];

  // Currency
  currentCurrency: string;

  // Actions
  onBuy: () => void;
  onSend: () => Promise<void>;
  onReceive: () => void;

  // Tron-specific
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
  // Security & Trust
  /** Resolved security data owned by the parent (TokenDetails). */
  securityData?: TokenSecurityData | null;
  /** Whether security data is still being fetched. */
  isSecurityDataLoading?: boolean;
  /** Whether the security data fetch failed. Hides the card when true. */
  hasSecurityDataError?: boolean;

  // Ambient price color A/B test
  onPriceDirectionChange?: (isPositive: boolean) => void;
  useAmbientColor?: boolean;

  // Exit action tracking
  onExitAction?: () => void;
  /** Resolved price direction from the chart; true = positive, false = negative, null = not yet resolved. */
  isPricePositive?: boolean | null;
  /** Called whenever the perps market loading state settles. Lets the parent avoid a duplicate hook call. */
  onPerpsMarketResolved?: (result: {
    hasPerpsMarket: boolean;
    isLoading: boolean;
  }) => void;
  recurringOrder?: RecurringOrder;
}

/**
 * AssetOverviewContent composes all UI sections for the token details view.
 * This component receives all data via props and renders:
 * - Price section with chart
 * - Chart navigation buttons
 * - Action buttons (Buy, Swap, Send, Receive)
 * - Balance display
 * - Perps discovery banner
 * - Token details (contract, decimals, etc.)
 */
const AssetOverviewContent: React.FC<AssetOverviewContentProps> = ({
  token,
  balance,
  balanceCta,
  balanceDescription,
  balancePriceChangeOverride,
  balancePriceChangeOverrideColor,
  mainBalance,
  secondaryBalance,
  currentPrice,
  priceDiff,
  comparePrice,
  prices,
  isLoading,
  hasInsufficientCoverage,
  timePeriod,
  setTimePeriod,
  chartNavigationButtons,
  currentCurrency,
  onBuy,
  onSend,
  onReceive,
  stakedTrxAsset,
  inLockPeriodBalance,
  readyForWithdrawalBalance,
  onMarketInsightsDisplayResolved,
  securityData,
  isSecurityDataLoading = false,
  hasSecurityDataError = false,
  onPriceDirectionChange,
  useAmbientColor,
  onExitAction,
  isPricePositive,
  onPerpsMarketResolved,
  recurringOrder,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const resetNavigationLockRef = useRef<(() => void) | null>(null);
  const { isTokenTradable } = useRWAToken();

  const hasBalanceValue = Boolean(balance) && balance !== '0';
  const trackActionTapped = useTokenDetailsActionTracking({
    token,
    hasBalance: hasBalanceValue,
    severity: securityData?.resultType,
  });
  const tronNativeToken = isTronNativeToken(token) ? token : null;
  const isAssetInactive = useSelector((state) =>
    getIsAssetRequireActivate(state, {
      assetId: token.address,
    }),
  );
  const spendableBalanceData = useSpendableBalance({
    assetId: token.address,
  });
  const showSpendableBalance = spendableBalanceData.hasSpendableBalance;

  const {
    hasPerpsMarket,
    marketData,
    isLoading: isPerpsLoading,
    handlePerpsAction,
  } = usePerpsActions({
    symbol: token.symbol,
    fromTokenDetails: true,
    transactionActiveAbTests: token.transactionActiveAbTests,
  });

  // Check if user has a position for this asset (only if market exists)
  const { position: perpsPosition, isLoading: isPerpsPositionLoading } =
    usePerpsPositionForAsset(hasPerpsMarket ? token.symbol : null);

  const isTokenTrustworthy = isTokenTrustworthyForPerps(token);

  const showPerpsSection =
    hasPerpsMarket &&
    Boolean(marketData) &&
    isTokenTrustworthy &&
    !isPerpsPositionLoading;

  const { securityConfig, handleSecurityBadgePress } =
    useTokenSecurityBadgePress(token, securityData);

  const goToBrowserUrl = (url: string) => {
    navigateWithDetails(navigation, createWebviewNavDetails({ url }));
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

  const handleRecurringOrderPress = useCallback(
    (order: RecurringOrder) => {
      onExitAction?.();
      navigation.navigate(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.RECURRING_ORDER_DETAILS,
        params: { order },
      });
    },
    [navigation, onExitAction],
  );

  const mostRecentOrderType = getMostRecentOrderType({ recurringOrder });
  const handleOrdersHeaderPress = useCallback(() => {
    if (!mostRecentOrderType) {
      return;
    }

    onExitAction?.();
    const params = startSwapBridgePageLoadTrace({
      sourcePage: 'TokenDetails',
      bridgeViewMode: BridgeViewMode.Unified,
      location: MetaMetricsSwapsEventSource.TokenView,
      initialTab: mostRecentOrderType,
    });

    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });
  }, [mostRecentOrderType, navigation, onExitAction]);

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

  const tokenDisplaySymbol = token.symbol || token.name;
  const securityBadgeDescription = (() => {
    if (securityData?.resultType === 'Malicious') {
      return tokenDisplaySymbol
        ? strings('security_trust.malicious_token_description', {
            symbol: tokenDisplaySymbol,
          })
        : strings('security_trust.malicious_token_description_no_symbol');
    }
    return tokenDisplaySymbol
      ? strings('security_trust.suspicious_token_description', {
          symbol: tokenDisplaySymbol,
        })
      : strings('security_trust.suspicious_token_description_no_symbol');
  })();

  return (
    <Box twClassName="pt-[2px]" testID={TokenOverviewSelectorsIDs.CONTAINER}>
      {token.hasBalanceError ? (
        renderWarning()
      ) : (
        <View>
          {securityData &&
            (securityData.resultType === 'Malicious' ||
              securityData.resultType === 'Warning' ||
              securityData.resultType === 'Spam') && (
              <SecurityBanner
                securityConfig={securityConfig}
                backgroundClass={
                  securityData.resultType === 'Malicious'
                    ? 'bg-error-muted'
                    : 'bg-warning-muted'
                }
                titleFontWeight={
                  securityData.resultType === 'Malicious'
                    ? FontWeight.Bold
                    : FontWeight.Medium
                }
                testID={
                  securityData.resultType === 'Malicious'
                    ? 'security-banner-malicious'
                    : 'security-banner-warning'
                }
                title={
                  securityData.resultType === 'Malicious'
                    ? strings('security_trust.malicious_token_title')
                    : undefined
                }
                description={securityBadgeDescription}
                className="mx-4 mb-3 gap-4"
                onPress={handleSecurityBadgePress}
              />
            )}

          {isAssetInactive ? (
            <AssetActivateCard token={token} chainName="Stellar" />
          ) : null}

          <Price
            asset={token}
            prices={prices}
            timePeriod={timePeriod}
            chartNavigationButtons={chartNavigationButtons}
            setTimePeriod={setTimePeriod}
            priceDiff={priceDiff}
            currentCurrency={currentCurrency}
            currentPrice={currentPrice}
            comparePrice={comparePrice}
            isLoading={isLoading}
            hasInsufficientCoverage={hasInsufficientCoverage}
            onPriceDirectionChange={onPriceDirectionChange}
            useAmbientColor={useAmbientColor}
          />
          {!isTokenTradable(token as BridgeToken) && (
            <View style={styles.marketClosedActionButtonContainer}>
              <MarketClosedActionButton
                iconName={ComponentLibraryIconName.Info}
                label={strings('asset_overview.market_closed')}
                onPress={handleMarketClosedButtonPress}
              />
            </View>
          )}
          <TokenDetailsActionsSection
            token={token}
            severity={securityData?.resultType}
            onBuy={onBuy}
            onSend={onSend}
            onReceive={onReceive}
            hasBalance={hasBalanceValue}
            perpsMarket={{
              hasPerpsMarket,
              isLoading: isPerpsLoading,
              handlePerpsAction,
            }}
            onPerpsMarketResolved={onPerpsMarketResolved}
            onActionTapped={trackActionTapped}
            resetNavigationLockRef={resetNavigationLockRef}
            onExitAction={onExitAction}
          />
          <MoneyEarnBanner asset={token} />
          <TokenDetailsMarketInsightsSection
            token={token}
            securityData={securityData ?? null}
            onDisplayResolved={onMarketInsightsDisplayResolved}
            useAmbientColor={useAmbientColor}
            pricePercentChange={
              comparePrice > 0 ? (priceDiff / comparePrice) * 100 : 0
            }
            containerStyle={styles.marketInsightsWrapper}
          />
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            tronNativeToken && <TronEnergyBandwidthDetail />
            ///: END:ONLY_INCLUDE_IF
          }
          {balance != null && spendableBalanceData.hasSpendableBalance && (
            <SpendableBalanceSection
              minimumReserveBalance={spendableBalanceData.minimumReserveBalance}
              spendableBalance={spendableBalanceData.spendableBalance}
              totalBalance={String(balance)}
              symbol={token.symbol}
              fiatValue={mainBalance}
            />
          )}
          {balance != null && !spendableBalanceData.hasSpendableBalance && (
            <>
              <Balance
                asset={token}
                balanceCta={balanceCta}
                balanceDescription={balanceDescription}
                mainBalance={mainBalance}
                priceChangeOverride={balancePriceChangeOverride}
                priceChangeOverrideColor={balancePriceChangeOverrideColor}
                secondaryBalance={secondaryBalance}
              />
              <EarnBalance asset={token} />
            </>
          )}
          {
            ///: BEGIN:ONLY_INCLUDE_IF(tron)
            tronNativeToken && (
              <TronAssetOverviewSection
                token={tronNativeToken}
                stakedTrxAsset={stakedTrxAsset}
                inLockPeriodBalance={inLockPeriodBalance}
                readyForWithdrawalBalance={readyForWithdrawalBalance}
              />
            )
            ///: END:ONLY_INCLUDE_IF
          }
          {showPerpsSection && perpsPosition && (
            <View style={styles.perpsPositionCardContainer}>
              <Text variant={TextVariant.HeadingMd} twClassName="mb-2 px-4">
                {strings('asset_overview.perps_position')}
              </Text>
              <PerpsCard
                position={perpsPosition}
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
          {recurringOrder ? (
            <TokenDetailsOrdersSection
              latestRecurringOrder={recurringOrder}
              onOrdersHeaderPress={handleOrdersHeaderPress}
              onRecurringOrderPress={handleRecurringOrderPress}
            />
          ) : null}
          <View style={styles.tokenDetailsWrapper}>
            <TokenDetails
              asset={token}
              onCopyAddress={() =>
                trackActionTapped(TokenDetailsAction.CopyTokenAddress)
              }
            />
          </View>
          {!hasSecurityDataError &&
            (isSecurityDataLoading || securityData?.resultType) && (
              <View style={styles.securityTrustWrapper}>
                <SecurityTrustEntryCard
                  securityData={securityData ?? null}
                  isLoading={isSecurityDataLoading}
                  token={token as TokenDetailsRouteParams}
                  useAmbientColor={useAmbientColor}
                />
              </View>
            )}
        </View>
      )}
    </Box>
  );
};

export default AssetOverviewContent;
