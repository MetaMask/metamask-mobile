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
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../hooks/useStyles';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import {
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import { useIsPriceAlertsChainSupported } from '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported';
import WatchlistStarButton from '../../Assets/watchlist/components/WatchlistStarButton';
import ShareTokenBottomSheet from '../components/ShareTokenBottomSheet';
import { TokenDetailsV1Header } from '../components/TokenDetailsV1Header';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenHeaderScroll } from '../hooks/useTokenHeaderScroll';
import { useTokenPrice } from '../hooks/useTokenPrice';
import { useTokenSecurityData } from '../hooks/useTokenSecurityData';
import { formatTokenAge } from '../utils/formatTokenAge';

export const TOKEN_DETAILS_V1_TEST_ID = 'token-details-v1';

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

  const { scrollY, onScroll } = useTokenHeaderScroll();

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll(event.nativeEvent.contentOffset.y);
    },
    [onScroll],
  );

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

  const tokenAge = useMemo(
    () => formatTokenAge(securityData?.created) ?? undefined,
    [securityData?.created],
  );

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

  const { currentPrice, priceDiff, comparePrice, currentCurrency } =
    useTokenPrice({ token });

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
    <View style={styles.wrapper} testID={TOKEN_DETAILS_V1_TEST_ID}>
      <TokenDetailsV1Header
        token={token}
        securityData={securityData}
        tokenAge={tokenAge}
        scrollY={scrollY}
        onBackPress={handleBackPress}
        onSharePress={shareUrl ? handleShare : undefined}
        starButton={starButton}
        onPriceAlertPress={
          isPriceAlertsSupported ? handlePriceAlertPress : undefined
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID="token-details-v1-scroll-view"
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 gap-2 px-6 py-20"
        >
          <Text
            variant={TextVariant.HeadingLg}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
          >
            Dedicated meme coin view
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {`A tailored experience for ${
              token.symbol ?? 'this token'
            } is being built. Check back soon.`}
          </Text>
        </Box>
      </ScrollView>

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
  );
};

export default TokenDetailsV1;
