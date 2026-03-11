import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Box, IconName } from '@metamask/design-system-react-native';
import { selectTokenListLayoutV2Enabled } from '../../../../selectors/featureFlagController/tokenListLayout';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import {
  TokenDetailsSource,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../hooks/useStyles';
import { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { isMainnetByChainId } from '../../../../util/networks';
import useBlockExplorer from '../../../hooks/useBlockExplorer';
import HeaderStandardAnimated from '../../../../component-library/components-temp/HeaderStandardAnimated/HeaderStandardAnimated';
import useHeaderStandardAnimated from '../../../../component-library/components-temp/HeaderStandardAnimated/useHeaderStandardAnimated';
import TitleSubpage from '../../../../component-library/components-temp/TitleSubpage';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../../NetworkAssetLogo';
import { NetworkBadgeSource } from '../../AssetOverview/Balance/Balance';
import AssetOverviewContent from '../components/AssetOverviewContent';
import { Hex } from '@metamask/utils';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenActions } from '../hooks/useTokenActions';
import { useTokenTransactions } from '../hooks/useTokenTransactions';
import { selectPerpsEnabledFlag } from '../../Perps';
import { TraceName, endTrace } from '../../../../util/trace';
import {
  isNetworkRampNativeTokenSupported,
  isNetworkRampSupported,
} from '../../Ramp/Aggregator/utils';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import AppConstants from '../../../../core/AppConstants';
import { getIsSwapsAssetAllowed } from '../../../Views/Asset/utils';
import ActivityHeader from '../../../Views/Asset/ActivityHeader';
import Transactions from '../../Transactions';
import MultichainTransactionsView from '../../../Views/MultichainTransactionsView/MultichainTransactionsView';
import { TransactionDetailLocation } from '../../../../core/Analytics/events/transactions';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomSheetFooter: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    ethLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
    },
  });
};

/**
 * TokenDetails component - Clean orchestrator that fetches data and sets layout.
 * All business logic is delegated to hooks and presentation to AssetOverviewContent.
 */
const TokenDetails: React.FC<{
  token: TokenDetailsRouteParams;
  onMarketInsightsDisplayResolved?: (isDisplayed: boolean) => void;
}> = ({ token, onMarketInsightsDisplayResolved }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // A/B test hook for layout selection
  const { useNewLayout } = useTokenDetailsABTest();
  const { isTokenTradingOpen } = useRWAToken();

  useEffect(() => {
    endTrace({ name: TraceName.AssetDetails });
  }, []);

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const networkName = networkConfigurationByChainId?.name;

  const isNativeToken = token.isNative ?? token.isETH;
  const isMainnet = isMainnetByChainId(token.chainId);
  const { getBlockExplorerUrl } = useBlockExplorer(token.chainId);

  const shouldShowMoreOptionsInNavBar =
    isMainnet ||
    !isNativeToken ||
    (isNativeToken && getBlockExplorerUrl(token.address, token.chainId));

  const openAssetOptions = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetOptions',
      params: {
        isNativeCurrency: isNativeToken,
        address: token.address,
        chainId: token.chainId,
        asset: token,
      },
    });
  };

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const {
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading,
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,
    currentCurrency,
  } = useTokenPrice({ token });

  const {
    balance,
    fiatBalance,
    tokenFormattedBalance,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    inLockPeriodBalance,
    readyForWithdrawalBalance,
    ///: END:ONLY_INCLUDE_IF
  } = useTokenBalance(token);

  const {
    onBuy,
    onSend,
    onReceive,
    goToSwaps,
    handleBuyPress,
    handleSellPress,
    networkModal,
  } = useTokenActions({
    token,
    networkName,
  });

  const {
    transactions,
    submittedTxs,
    confirmedTxs,
    loading: txLoading,
    transactionsUpdated,
    selectedAddress,
    conversionRate,
    currentCurrency: txCurrentCurrency,
    isNonEvmAsset: txIsNonEvmAsset,
  } = useTokenTransactions(token);

  const isSwapsAssetAllowed = getIsSwapsAssetAllowed({
    asset: {
      isETH: token.isETH ?? false,
      isNative: token.isNative ?? false,
      address: token.address ?? '',
      chainId: token.chainId ?? '',
    },
  });
  const displaySwapsButton = isSwapsAssetAllowed && AppConstants.SWAPS.ACTIVE;

  const rampNetworks = useSelector(getRampNetworks);

  const chainIdForRamp = token.chainId ?? '';
  const isRampAvailable = isNativeToken
    ? isNetworkRampNativeTokenSupported(chainIdForRamp, rampNetworks)
    : isNetworkRampSupported(chainIdForRamp, rampNetworks);

  const { scrollY, onScroll, setTitleSectionHeight, titleSectionHeightSv } =
    useHeaderStandardAnimated();

  const headerTitle = token.name || token.symbol;
  const headerSubtitle = token.symbol;

  const titleSectionStartAccessory = useMemo(() => {
    const avatar =
      (token.isNative ?? token.isETH) ? (
        <NetworkAssetLogo
          chainId={token.chainId as Hex}
          style={styles.ethLogo}
          ticker={token.ticker ?? token.symbol}
          big={false}
          biggest={false}
          testID={token.name}
        />
      ) : (
        <AvatarToken
          name={token.symbol}
          imageSource={{ uri: token.image }}
          size={AvatarSize.Lg}
        />
      );
    return (
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={NetworkBadgeSource(token.chainId as Hex)}
            name={networkConfigurationByChainId?.name}
          />
        }
      >
        {avatar}
      </BadgeWrapper>
    );
  }, [
    token.chainId,
    token.image,
    token.isNative,
    token.isETH,
    token.name,
    token.symbol,
    token.ticker,
    networkConfigurationByChainId?.name,
    styles.ethLogo,
  ]);

  const assetOverviewContent = (
    <AssetOverviewContent
      token={token}
      balance={balance}
      mainBalance={fiatBalance ?? ''}
      secondaryBalance={tokenFormattedBalance}
      currentPrice={currentPrice}
      priceDiff={priceDiff}
      comparePrice={comparePrice}
      prices={prices}
      isLoading={isLoading}
      timePeriod={timePeriod}
      setTimePeriod={setTimePeriod}
      chartNavigationButtons={chartNavigationButtons}
      isPerpsEnabled={isPerpsEnabled}
      displayBuyButton={isRampAvailable}
      displaySwapsButton={displaySwapsButton}
      currentCurrency={currentCurrency}
      onBuy={onBuy}
      onSend={onSend}
      onReceive={onReceive}
      goToSwaps={goToSwaps}
      onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      isTronNative={isTronNative}
      stakedTrxAsset={stakedTrxAsset}
      inLockPeriodBalance={inLockPeriodBalance}
      readyForWithdrawalBalance={readyForWithdrawalBalance}
      ///: END:ONLY_INCLUDE_IF
    />
  );

  const activityHeader = (
    <ActivityHeader
      asset={{
        ...token,
        hasBalanceError: token.hasBalanceError ?? false,
      }}
    />
  );

  const renderLoader = () => (
    <View style={styles.loader}>
      <ActivityIndicator style={styles.loader} size="small" />
    </View>
  );

  return (
    <SafeAreaView
      style={styles.wrapper}
      edges={['top']}
      testID="token-details-safe-area"
    >
      <HeaderStandardAnimated
        scrollY={scrollY}
        titleSectionHeight={titleSectionHeightSv}
        title={headerTitle}
        subtitle={headerSubtitle}
        onBack={() => navigation.goBack()}
        endButtonIconProps={
          shouldShowMoreOptionsInNavBar && !useNewLayout
            ? [{ iconName: IconName.MoreVertical, onPress: openAssetOptions }]
            : undefined
        }
      />
      {txLoading ? (
        renderLoader()
      ) : (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.wrapper}
        >
          <Box
            testID="token-details-title-section"
            onLayout={(e) => setTitleSectionHeight(e.nativeEvent.layout.height)}
            twClassName="px-4"
          >
            <TitleSubpage
              title={headerTitle}
              bottomLabel={headerSubtitle}
              startAccessory={titleSectionStartAccessory}
            />
          </Box>
          {assetOverviewContent}
          {activityHeader}
          {txIsNonEvmAsset ? (
            <MultichainTransactionsView
              embeddedInScrollView
              transactions={transactions}
              navigation={navigation}
              selectedAddress={selectedAddress}
              chainId={token.chainId as SupportedCaipChainId}
              enableRefresh
              showDisclaimer
              location={TransactionDetailLocation.AssetDetails}
            />
          ) : (
            <Transactions
              embeddedInScrollView
              assetSymbol={token.symbol}
              navigation={navigation}
              transactions={transactions}
              submittedTransactions={submittedTxs}
              confirmedTransactions={confirmedTxs}
              selectedAddress={selectedAddress}
              conversionRate={conversionRate}
              currentCurrency={txCurrentCurrency}
              networkType={token.chainId}
              loading={!transactionsUpdated}
              headerHeight={280}
              tokenChainId={token.chainId}
              skipScrollOnClick
              location={TransactionDetailLocation.AssetDetails}
            />
          )}
        </Animated.ScrollView>
      )}
      {networkModal}
      {useNewLayout &&
        !txLoading &&
        displaySwapsButton &&
        isTokenTradingOpen(token as BridgeToken) && (
          <BottomSheetFooter
            style={{
              ...styles.bottomSheetFooter,
              paddingBottom: insets.bottom + 6,
            }}
            buttonPropsArray={[
              {
                variant: ButtonVariants.Primary,
                label: strings('asset_overview.buy_button'),
                size: ButtonSize.Lg,
                onPress: handleBuyPress,
              },
              // Only show Sell button if user has balance of this token
              ...(balance && parseFloat(String(balance)) > 0
                ? [
                    {
                      variant: ButtonVariants.Primary,
                      label: strings('asset_overview.sell_button'),
                      size: ButtonSize.Lg,
                      onPress: handleSellPress,
                    },
                  ]
                : []),
            ]}
            buttonsAlignment={ButtonsAlignment.Horizontal}
          />
        )}
    </SafeAreaView>
  );
};

/**
 * Fires TOKEN_DETAILS_OPENED for both V2 and legacy Asset view.
 * Includes ab_tests property when navigating from the token list and the
 * token list layout A/B test is active.
 */
const useTokenDetailsOpenedTracking = (params: TokenDetailsRouteParams) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { variantName, isTestActive } = useTokenDetailsABTest();
  const isTokenListV2 = useSelector(selectTokenListLayoutV2Enabled);
  const lastTrackedTokenKeyRef = useRef<string | null>(null);

  return useCallback(
    ({ isMarketInsightsDisplayed }: { isMarketInsightsDisplayed: boolean }) => {
      const source = params.source ?? TokenDetailsSource.Unknown;
      const tokenTrackingKey = `${params.chainId ?? ''}:${params.address ?? ''}:${params.symbol ?? ''}:${source}`;

      if (lastTrackedTokenKeyRef.current === tokenTrackingKey) {
        return;
      }

      const hasBalance =
        params.balance !== undefined &&
        params.balance !== null &&
        params.balance !== '0' &&
        params.balance !== '';

      const isFromTokenList =
        source === TokenDetailsSource.MobileTokenList ||
        source === TokenDetailsSource.MobileTokenListPage;

      const eventProperties = {
        source,
        chain_id: params.chainId,
        token_symbol: params.symbol,
        token_address: params.address,
        token_name: params.name,
        has_balance: hasBalance,
        market_insights_displayed: isMarketInsightsDisplayed,
        // A/B test attribution — each experiment is independent
        ...((isTestActive || isFromTokenList) && {
          ab_tests: {
            ...(isTestActive && {
              assetsASSETS2493AbtestTokenDetailsLayout: variantName,
            }),
            ...(isFromTokenList && {
              assetsASSETS2621AbtestTokenListLayout: isTokenListV2
                ? 'v2'
                : 'v1',
            }),
          },
        }),
      };
      const event = createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
        .addProperties(eventProperties)
        .build();
      trackEvent(event);
      lastTrackedTokenKeyRef.current = tokenTrackingKey;
    },
    [
      createEventBuilder,
      isTestActive,
      isTokenListV2,
      params.address,
      params.balance,
      params.chainId,
      params.name,
      params.source,
      params.symbol,
      trackEvent,
      variantName,
    ],
  );
};

/**
 * TokenDetailsRouteWrapper screen
 * Reads token from React Navigation route.params and renders TokenDetails.
 */
export const TokenDetailsRouteWrapper: React.FC = () => {
  const route = useRoute();
  const token = route.params as TokenDetailsRouteParams;

  const trackTokenDetailsOpened = useTokenDetailsOpenedTracking(token);

  const handleMarketInsightsDisplayResolved = useCallback(
    (isDisplayed: boolean) => {
      trackTokenDetailsOpened({
        isMarketInsightsDisplayed: isDisplayed,
      });
    },
    [trackTokenDetailsOpened],
  );

  return (
    <TokenDetails
      token={token}
      onMarketInsightsDisplayResolved={handleMarketInsightsDisplayResolved}
    />
  );
};

export { TokenDetailsRouteWrapper as TokenDetails };
