import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { Theme } from '@metamask/design-tokens';
import {
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
  type SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { isCaipAssetType, type CaipAssetType } from '@metamask/utils';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../hooks/useStyles';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import {
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import Price from '../../AssetOverview/Price/Price';
import PriceChartContext, {
  PriceChartProvider,
} from '../../AssetOverview/PriceChart/PriceChart.context';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import { useIsPriceAlertsChainSupported } from '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported';
import WatchlistStarButton from '../../Assets/watchlist/components/WatchlistStarButton';
import ShareTokenBottomSheet from '../components/ShareTokenBottomSheet';
import TokenDetailsV1Overview from '../components/TokenDetailsV1Overview';
import TokenDetailsV1TabBar from '../components/TokenDetailsV1TabBar';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import type {
  TokenDetailsRouteParams,
  TokenDetailsV1TabKey,
} from '../constants/constants';
import { useLivePriceHeaderDescription } from '../hooks/useLivePriceHeaderDescription';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import SocialFeed from '../../SocialFeed/components/SocialFeed';

export const TOKEN_DETAILS_V1_TEST_ID = 'token-details-v1';
export const TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID =
  'token-details-v1-scroll-view';
export const TOKEN_DETAILS_V1_TAB_PANEL_TEST_ID_PREFIX =
  'token-details-v1-tab-panel';

/**
 * Direct-child index of the tab bar inside the body ScrollView — registered in
 * `stickyHeaderIndices` so the tab bar docks below the nav header when the
 * price hero, chart and tab content scroll under it.
 */
export const TOKEN_DETAILS_TAB_BAR_STICKY_INDEX = 1;

interface ShareTokenBottomSheetControllerRef {
  open: () => void;
}

const ShareTokenBottomSheetController = forwardRef<
  ShareTokenBottomSheetControllerRef,
  Omit<React.ComponentProps<typeof ShareTokenBottomSheet>, 'onClose'>
>((props, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  useImperativeHandle(ref, () => ({ open: () => setIsVisible(true) }), []);

  return isVisible ? (
    <ShareTokenBottomSheet {...props} onClose={() => setIsVisible(false)} />
  ) : null;
});

ShareTokenBottomSheetController.displayName = 'ShareTokenBottomSheetController';

/**
 * Lightweight placeholder panel for tabs whose content is still a follow-up.
 * The tab bar itself stays as built for Overview / Security / Feed.
 */
const TokenDetailsV1TabPlaceholder = ({
  tab,
}: {
  tab: TokenDetailsV1TabKey;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Center}
    twClassName="py-8"
    testID={`${TOKEN_DETAILS_V1_TAB_PANEL_TEST_ID_PREFIX}-${tab}`}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {strings('token_details_v1.tab_placeholder')}
    </Text>
  </Box>
);

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      minHeight: '100%',
    },
  });
};

interface TokenDetailsV1Props {
  token: TokenDetailsRouteParams;
}

export const TokenDetailsV1: React.FC<TokenDetailsV1Props> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const shareSheetRef = useRef<ShareTokenBottomSheetControllerRef>(null);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const caip19AssetId = useMemo((): CaipAssetType | null => {
    try {
      if (token.caipAssetId && isCaipAssetType(token.caipAssetId)) {
        return token.caipAssetId;
      }
      if (isCaipAssetType(token.address)) {
        return token.address as CaipAssetType;
      }
      if (!token.chainId) return null;
      const formatted = formatAddressToAssetId(token.address, token.chainId);
      if (formatted) return formatted as CaipAssetType;
      const nonEvmConfig =
        AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[
          token.chainId as SupportedCaipChainId
        ];
      return (nonEvmConfig?.nativeCurrency as CaipAssetType) ?? null;
    } catch {
      return null;
    }
  }, [token.caipAssetId, token.address, token.chainId]);

  const shareUrl = useMemo(
    () =>
      caip19AssetId
        ? `https://link.metamask.io/asset?assetId=${encodeURIComponent(
            caip19AssetId,
          )}`
        : null,
    [caip19AssetId],
  );

  const handleShare = useCallback(() => {
    if (!shareUrl) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_SHARED)
        .addProperties({
          chain_id: token.chainId,
          token_symbol: token.symbol,
          token_address: token.address,
        })
        .build(),
    );

    shareSheetRef.current?.open();
  }, [
    shareUrl,
    createEventBuilder,
    token.address,
    token.chainId,
    token.symbol,
    trackEvent,
  ]);

  const { securityData } = useTokenSecurityData({
    assetId: caip19AssetId,
    prefetchedData: token.securityData,
  });

  const isNativeToken = Boolean(token.isETH || token.isNative);
  const hasBalanceValue = useMemo(() => {
    if (token.balance === undefined || token.balance === null) return false;
    return Number(token.balance) > 0;
  }, [token.balance]);

  const starButton = useMemo(
    () => (
      <WatchlistStarButton
        assetId={caip19AssetId}
        assetType={isNativeToken ? 'native' : 'erc20'}
        hasBalance={hasBalanceValue}
        source="token_details"
      />
    ),
    [caip19AssetId, isNativeToken, hasBalanceValue],
  );

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);

  const {
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading: isPriceLoading,
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,
    currentCurrency,
    hasInsufficientCoverage,
  } = useTokenPrice({ token });

  const [activeTab, setActiveTab] = useState<TokenDetailsV1TabKey>('overview');

  const { description: headerDescription, onScrollOffset } =
    useLivePriceHeaderDescription({ currentPrice, currentCurrency });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollOffset(event.nativeEvent.contentOffset.y);
    },
    [onScrollOffset],
  );

  const currentPriceUsd = useMemo(() => {
    if (!Number.isFinite(currentPrice)) {
      return null;
    }
    return (
      calcUsdAmountFromFiat({
        tokenFiatValue: currentPrice,
        chainId: token.chainId ?? undefined,
        networkConfigurationsByChainId,
        evmMultiChainCurrencyRates,
      }) ?? null
    );
  }, [
    currentPrice,
    token.chainId,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
  ]);

  const isPriceAlertsChainSupported =
    useIsPriceAlertsChainSupported(caip19AssetId);
  const isPriceAlertsSupported =
    isPriceAlertsChainSupported &&
    (currentPriceUsd ?? 0) > 0 &&
    !isNonEvmChainId(token.chainId as string);

  const handlePriceAlertPress = useCallback(() => {
    if (!caip19AssetId) {
      return;
    }
    navigation.navigate(Routes.MANAGE_PRICE_ALERTS, {
      symbol: token.symbol,
      ticker: token.ticker,
      currentPrice: currentPriceUsd ?? 0,
      currentCurrency: 'usd',
      assetId: caip19AssetId,
    });
  }, [navigation, token.symbol, token.ticker, currentPriceUsd, caip19AssetId]);

  return (
    <PriceChartProvider>
      <View style={styles.wrapper} testID={TOKEN_DETAILS_V1_TEST_ID}>
        <TokenDetailsInlineHeader
          token={token}
          securityData={securityData}
          onBackPress={handleBackPress}
          onSharePress={shareUrl ? handleShare : undefined}
          starButton={starButton}
          onPriceAlertPress={
            isPriceAlertsSupported ? handlePriceAlertPress : undefined
          }
          description={headerDescription}
        />

        {/* The tab bar is a direct ScrollView child registered in
            `stickyHeaderIndices`, so it docks right below the nav header
            while the price hero, chart and tab content scroll under it. */}
        <PriceChartContext.Consumer>
          {({ isChartBeingTouched }) => (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              stickyHeaderIndices={[TOKEN_DETAILS_TAB_BAR_STICKY_INDEX]}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              scrollEnabled={!isChartBeingTouched}
              testID={TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID}
            >
              <Price
                asset={token}
                prices={prices}
                timePeriod={timePeriod}
                chartNavigationButtons={chartNavigationButtons}
                setTimePeriod={setTimePeriod}
                currentPrice={currentPrice}
                priceDiff={priceDiff}
                comparePrice={comparePrice}
                currentCurrency={currentCurrency}
                isLoading={isPriceLoading}
                hasInsufficientCoverage={hasInsufficientCoverage}
              />

              <TokenDetailsV1TabBar
                activeTab={activeTab}
                onTabPress={setActiveTab}
              />

              {activeTab === 'overview' ? (
                <TokenDetailsV1Overview
                  token={token}
                  assetId={caip19AssetId}
                  currentCurrency={currentCurrency}
                />
              ) : activeTab === 'feed' && caip19AssetId ? (
                <SocialFeed
                  source={{ kind: 'token', assetId: caip19AssetId }}
                  location="token_details"
                />
              ) : (
                <TokenDetailsV1TabPlaceholder tab={activeTab} />
              )}
            </ScrollView>
          )}
        </PriceChartContext.Consumer>

        {shareUrl && (
          <ShareTokenBottomSheetController
            ref={shareSheetRef}
            shareUrl={shareUrl}
            token={token}
            currentPrice={currentPrice ?? 0}
            priceDiff={priceDiff ?? 0}
            comparePrice={comparePrice ?? 0}
            currentCurrency={currentCurrency ?? 'usd'}
            securityData={securityData}
            networkName={networkConfigurationByChainId?.name}
          />
        )}
      </View>
    </PriceChartProvider>
  );
};

export default TokenDetailsV1;
