import type { TokenSecurityData } from '@metamask/assets-controllers';
import {
  Button,
  ButtonAnimated,
  ButtonVariant,
  Box,
  BottomSheetDialog,
  BottomSheetOverlay,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { useTokenChartPreferences } from '../../AssetOverview/Price/hooks/useTokenChartPreferences';
import { ONDO_RESTRICTED_COUNTRIES } from '../../../../util/ondoGeoRestrictions';
import { LIGHT_MODE_SUCCESS_GREEN, useTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import { isAsiaGeolocationLocation } from '../../../../util/region/isAsiaGeolocationLocation';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import type { BridgeToken } from '../../Bridge/types';
import useTokenBuyability from '../../Ramp/hooks/useTokenBuyability';
import { getResultTypeConfig } from '../../SecurityTrust/utils/securityUtils';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useStickyFooterTracking } from '../hooks/useStickyFooterTracking';
import { useStickyTokenActions } from '../hooks/useStickyTokenActions';
import type { QuickBuyFooterLayout } from '../../QuickBuy/abTestConfig';
import type { QuickBuyTradeMode } from '../../QuickBuy/types';
import TraderPositionPnl, {
  type TraderPositionPnlProps,
} from '../TraderPositionPnl/TraderPositionPnl';
import RwaUnavailableBottomSheet, {
  type RwaUnavailableBottomSheetRef,
} from './RwaUnavailableBottomSheet/RwaUnavailableBottomSheet';

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
    paddingBottom: 0,
  },
  iconButton: {
    flex: 1,
    paddingLeft: 0,
    paddingRight: 4,
  },
  quickBuyButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
  },
  moneyDepositButton: {
    flex: 1,
    paddingLeft: 0,
    paddingRight: 0,
  },
  expandedDetailsMeasurement: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
  },
});

const BALANCE_THRESHOLD_USD = 100;

const SUCCESS_TEXT_PROPS = { color: TextColor.SuccessInverse } as const;
const ERROR_TEXT_PROPS = { color: TextColor.ErrorInverse } as const;
const PRIMARY_ICON_PROPS = { size: IconSize.Md } as const;
const EXPANDED_DETAILS_FALLBACK_HEIGHT = 240;
const EXPANDED_DETAILS_BOTTOM_SPACING = 16;

type StickyButtonLayout =
  | 'both'
  | 'buy'
  | 'swap'
  | 'money_swap'
  | 'money'
  | 'buy_sell'
  | null;

export interface MoneyDepositCtaConfig {
  isLoading: boolean;
  label?: string;
  onPress: () => void;
}

interface TokenStickyFooterProps {
  token: TokenDetailsRouteParams;
  securityData?: TokenSecurityData | null | undefined;
  /** Token balance in USD, currency-agnostic. Used to determine which button gets the success style. */
  balanceFiatUsd?: number | undefined;
  /** Network name passed through to useTokenActions */
  networkName?: string;
  /** Up-to-date token balance for useTokenActions swap logic */
  currentTokenBalance?: string;
  hasTokenBalance?: boolean;
  moneyDepositCta?: MoneyDepositCtaConfig;
  onStickyButtonsResolved?: (shown: StickyButtonLayout) => void;
  /** When true the footer omits its small bottom spacing because the parent manages it. */
  skipBottomInset?: boolean;
  /** Optional testID for the swap button (used by E2E tests in different screens) */
  swapTestID?: string;
  /** Optional testID for the buy button (used by E2E tests in different screens) */
  buyTestID?: string;
  /** Optional callback fired when the swap button is pressed (for additional tracking by the parent). */
  onSwapPress?: () => void;
  /** Optional callback fired when the buy button is pressed (for additional tracking by the parent). */
  onBuyPress?: () => void;
  /** Optional callback fired when the quick buy (lightning) button is pressed. When omitted the button is not rendered. */
  onQuickBuyPress?: () => void;
  /** Optional testID for the quick buy button. */
  quickBuyTestID?: string;
  /** SWAPS-5094 footer layout. Non-control layouts need `onOpenQuickBuy` and are ignored while the Money CTA is active. */
  quickBuyEntrypointLayout?: QuickBuyFooterLayout;
  /** Opens the Quick Buy sheet in the given mode; used by the non-control layouts. */
  onOpenQuickBuy?: (mode: QuickBuyTradeMode) => void;
  /** Page name sent with swap/bridge analytics. Defaults to `'MainView'`. */
  sourcePage?: string;
  /** Whether the ambient price color A/B test treatment is active. */
  useAmbientColor?: boolean;
  /** Optional trader position header rendered above the footer actions. */
  traderPositionPnl?: TraderPositionPnlProps;
}

const TokenDetailsStickyFooter: React.FC<TokenStickyFooterProps> = ({
  token,
  securityData,
  balanceFiatUsd,
  networkName,
  currentTokenBalance,
  hasTokenBalance = false,
  moneyDepositCta,
  onStickyButtonsResolved,
  skipBottomInset = false,
  swapTestID,
  buyTestID,
  onSwapPress,
  onBuyPress,
  onQuickBuyPress,
  quickBuyTestID,
  quickBuyEntrypointLayout = 'lightning_swap_buy',
  onOpenQuickBuy,
  sourcePage,
  useAmbientColor = false,
  traderPositionPnl,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, themeAppearance } = useTheme();
  const isLightMode = themeAppearance === AppThemeKey.light;

  const { indicators: indicatorsActive } = useTokenChartPreferences();

  const geolocation = useSelector(getDetectedGeolocation);
  const useErrorAccent =
    useAmbientColor && isAsiaGeolocationLocation(geolocation);

  const getAccentClass = (prefix: string, defaultClass: string) => {
    if (useErrorAccent) {
      return `${prefix}-error-default`;
    }
    if (isLightMode) {
      return `${prefix}-[${LIGHT_MODE_SUCCESS_GREEN}]`;
    }
    return defaultClass;
  };

  const successBg = getAccentClass('bg', 'bg-success-default');
  const successBorder = getAccentClass('border', 'border-success-default');
  const successText = getAccentClass('text', 'text-success-default');

  const successColorHex = useErrorAccent
    ? colors.error.default
    : isLightMode
      ? LIGHT_MODE_SUCCESS_GREEN
      : colors.success.default;

  const secondaryTextProps = useMemo(
    () => ({ twClassName: successText }) as const,
    [successText],
  );
  const secondaryIconProps = useMemo(
    () =>
      ({ size: IconSize.Md, twClassName: `${successText} shrink-0` }) as const,
    [successText],
  );

  const { onBuy, onSwap, hasEligibleSwapTokens, networkModal } =
    useStickyTokenActions({
      token,
      currentTokenBalance,
      sourcePage,
    });

  const { isBuyable } = useTokenBuyability(token);
  const { isTokenTradable, isStockToken } = useRWAToken();

  const isRwaGeoRestricted = useMemo(() => {
    if (!isStockToken(token as BridgeToken)) return false;
    if (__DEV__) return false;
    const country = geolocation?.toUpperCase().split('-')[0];
    return !country || ONDO_RESTRICTED_COUNTRIES.has(country);
  }, [isStockToken, token, geolocation]);

  const rwaUnavailableSheetRef = useRef<RwaUnavailableBottomSheetRef>(null);

  const trackStickyFooterTapped = useStickyFooterTracking();

  const isMoneyDepositCtaActive = Boolean(moneyDepositCta);
  const entrypointLayout =
    !isMoneyDepositCtaActive && onOpenQuickBuy
      ? quickBuyEntrypointLayout
      : 'lightning_swap_buy';
  const isBuySellLayout = entrypointLayout === 'buy_sell';
  const showSwapButton = hasEligibleSwapTokens;
  const showBuyButton =
    !isMoneyDepositCtaActive && (isBuyable || !hasEligibleSwapTokens);
  const showMoneyDepositButton = isMoneyDepositCtaActive;
  const showBothButtons = showSwapButton && showBuyButton;
  const showQuickBuyButton = Boolean(onQuickBuyPress);
  const buyButtonLabel = token.symbol
    ? strings('asset_overview.buy_token_button', { symbol: token.symbol })
    : strings('asset_overview.buy_button');
  const isTraderPositionExpanded = Boolean(traderPositionPnl?.isExpanded);
  const onToggleTraderPositionExpanded = traderPositionPnl?.onToggleExpanded;
  const expandedDetailsHeight = useSharedValue(
    EXPANDED_DETAILS_FALLBACK_HEIGHT,
  );
  const expandedDetailsProgress = useSharedValue(
    isTraderPositionExpanded ? 1 : 0,
  );
  const gestureStartProgress = useSharedValue(isTraderPositionExpanded ? 1 : 0);
  const expandedDetailsStyle = useAnimatedStyle(
    () => ({
      maxHeight: expandedDetailsHeight.value * expandedDetailsProgress.value,
      overflow: 'hidden',
    }),
    [expandedDetailsHeight, expandedDetailsProgress],
  );

  useEffect(() => {
    expandedDetailsProgress.value = withTiming(
      isTraderPositionExpanded ? 1 : 0,
      {
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
      },
    );
  }, [expandedDetailsProgress, isTraderPositionExpanded]);

  const handleExpandedDetailsLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measuredHeight = event.nativeEvent.layout.height;
      if (measuredHeight > 0) {
        expandedDetailsHeight.value =
          measuredHeight + EXPANDED_DETAILS_BOTTOM_SPACING;
      }
    },
    [expandedDetailsHeight],
  );

  const handleSwipeExpandedStateChange = useCallback(
    (isExpanded: boolean) => {
      onToggleTraderPositionExpanded?.(isExpanded);
    },
    [onToggleTraderPositionExpanded],
  );

  const sheetGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(
          isTraderPositionExpanded && Boolean(onToggleTraderPositionExpanded),
        )
        .onStart(() => {
          'worklet';
          gestureStartProgress.value = expandedDetailsProgress.value;
        })
        .onUpdate((event) => {
          'worklet';
          const detailsHeight = Math.max(expandedDetailsHeight.value, 1);
          const nextProgress =
            gestureStartProgress.value - event.translationY / detailsHeight;
          expandedDetailsProgress.value = Math.max(
            0,
            Math.min(1, nextProgress),
          );
        })
        .onEnd((event) => {
          'worklet';
          const shouldCollapse =
            event.translationY > expandedDetailsHeight.value * 0.35 ||
            event.velocityY > 800;
          const targetProgress = shouldCollapse ? 0 : 1;

          expandedDetailsProgress.value = withTiming(
            targetProgress,
            {
              duration: 300,
              easing: Easing.inOut(Easing.cubic),
            },
            (finished) => {
              if (finished) {
                scheduleOnRN(handleSwipeExpandedStateChange, !shouldCollapse);
              }
            },
          );
        }),
    [
      expandedDetailsHeight,
      expandedDetailsProgress,
      gestureStartProgress,
      handleSwipeExpandedStateChange,
      isTraderPositionExpanded,
      onToggleTraderPositionExpanded,
    ],
  );

  const tradingOpen = isTokenTradable(token as BridgeToken);
  useEffect(() => {
    if (onStickyButtonsResolved) {
      if (!tradingOpen) {
        onStickyButtonsResolved(null);
        return;
      }
      if (isBuySellLayout) {
        onStickyButtonsResolved(hasTokenBalance ? 'buy_sell' : 'buy');
        return;
      }
      // Resolve visible CTA layout for TOKEN_DETAILS_OPENED analytics.
      const shown: StickyButtonLayout = isMoneyDepositCtaActive
        ? showSwapButton
          ? 'money_swap'
          : 'money'
        : showBothButtons
          ? 'both'
          : showSwapButton
            ? 'swap'
            : 'buy';
      onStickyButtonsResolved(shown);
    }
  }, [
    hasTokenBalance,
    isBuySellLayout,
    isMoneyDepositCtaActive,
    onStickyButtonsResolved,
    showBothButtons,
    showBuyButton,
    showSwapButton,
    tradingOpen,
  ]);

  const balanceUsd = balanceFiatUsd ?? 0;

  /**
   * When only one button is shown it always gets the success style.
   * When both are shown, swap gets success if balance >= $100, buy gets success otherwise.
   */
  const swapIsSuccess = isMoneyDepositCtaActive
    ? false
    : showBothButtons
      ? balanceUsd >= BALANCE_THRESHOLD_USD
      : showSwapButton;
  const buyIsSuccess = isMoneyDepositCtaActive
    ? showBuyButton
    : showBothButtons
      ? !swapIsSuccess
      : showBuyButton;

  const handleFooterAction = useCallback(
    (action: () => void, source: string, onNavigate?: () => void) => {
      if (isRwaGeoRestricted) {
        rwaUnavailableSheetRef.current?.onOpenBottomSheet();
        return;
      }

      const resultType = securityData?.resultType;

      // Only show warning sheet for Warning, Spam, or Malicious tokens
      if (!resultType || resultType === 'Verified' || resultType === 'Benign') {
        onNavigate?.();
        action();
        return;
      }

      const config = getResultTypeConfig(resultType);

      if (
        !config.icon ||
        !config.iconColor ||
        !config.sheetTitle ||
        !config.getSheetDescription
      ) {
        onNavigate?.();
        action();
        return;
      }

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: {
          icon: config.icon,
          iconColor: config.iconColor,
          title: config.sheetTitle,
          description: config.getSheetDescription(token.symbol || token.name),
          onProceed: () => {
            onNavigate?.();
            action();
          },
          source,
          severity: securityData?.resultType,
          tokenAddress: token.address,
          tokenSymbol: token.symbol || token.name,
          chainId: token.chainId,
          features: securityData?.features,
        },
      });
    },
    [
      isRwaGeoRestricted,
      navigation,
      securityData,
      token.symbol,
      token.name,
      token.address,
      token.chainId,
    ],
  );

  const handleOpenQuickBuy = (mode: QuickBuyTradeMode) => {
    if (!onOpenQuickBuy) return;
    trackStickyFooterTapped({
      ctaType: mode === 'sell' ? 'quick_sell' : 'quick_buy',
      balanceFiatUsd,
      tokenAddress: token.address ?? '',
      chainId: token.chainId ?? '',
      indicatorsActive,
    });
    handleFooterAction(
      () => onOpenQuickBuy(mode),
      strings(
        mode === 'sell'
          ? 'asset_overview.sell_button'
          : 'asset_overview.buy_button',
      ),
    );
  };

  const footerStyle = useMemo(
    () => ({
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: traderPositionPnl?.isExpanded ? 22 : 8,
      paddingBottom: 0,
    }),
    [colors.background.default, traderPositionPnl?.isExpanded],
  );
  const bottomSheetStyle = useMemo(
    () => ({
      borderTopColor: colors.border.muted,
      borderTopLeftRadius: traderPositionPnl?.isExpanded ? 32 : 0,
      borderTopRightRadius: traderPositionPnl?.isExpanded ? 32 : 0,
      borderTopWidth: 1,
      paddingBottom: skipBottomInset ? 4 : insets.bottom + 6,
    }),
    [
      colors.border.muted,
      insets.bottom,
      skipBottomInset,
      traderPositionPnl?.isExpanded,
    ],
  );
  if (!tradingOpen) return null;

  const moneyDepositButton = showMoneyDepositButton ? (
    <Button
      testID="money-asset-overview-footer-cta"
      variant={ButtonVariant.Primary}
      style={styles.moneyDepositButton}
      twClassName={successBg}
      textProps={SUCCESS_TEXT_PROPS}
      isLoading={moneyDepositCta?.isLoading}
      onPress={() => {
        if (!moneyDepositCta?.label) return;

        trackStickyFooterTapped({
          ctaType: 'money_deposit',
          balanceFiatUsd,
          tokenAddress: token.address ?? '',
          chainId: token.chainId ?? '',
          indicatorsActive,
        });
        handleFooterAction(moneyDepositCta.onPress, moneyDepositCta.label);
      }}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.SuccessInverse}
        numberOfLines={1}
        adjustsFontSizeToFit
        twClassName="text-center"
      >
        {moneyDepositCta?.label}
      </Text>
    </Button>
  ) : null;

  const positionContent = traderPositionPnl ? (
    <>
      <TraderPositionPnl {...traderPositionPnl} />
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.expandedDetailsMeasurement}
        onLayout={handleExpandedDetailsLayout}
      >
        <Box twClassName="rounded-lg bg-muted p-3">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.trader_position.expanded_placeholder')}
          </Text>
        </Box>
      </View>
      <Animated.View style={expandedDetailsStyle}>
        <Box
          testID="token-details-trader-position-pnl-expanded-placeholder"
          twClassName="rounded-lg bg-muted p-3"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.trader_position.expanded_placeholder')}
          </Text>
        </Box>
      </Animated.View>
    </>
  ) : null;

  const footerActions = (
    <>
      <View testID="bottomsheetfooter" style={styles.footer}>
        {showSwapButton && !isBuySellLayout && (
          <Button
            testID={swapTestID}
            variant={
              swapIsSuccess ? ButtonVariant.Primary : ButtonVariant.Secondary
            }
            style={styles.iconButton}
            twClassName={
              swapIsSuccess ? successBg : `bg-transparent ${successBorder}`
            }
            textProps={swapIsSuccess ? SUCCESS_TEXT_PROPS : secondaryTextProps}
            startIconName={IconName.SwapVertical}
            startIconProps={
              swapIsSuccess ? PRIMARY_ICON_PROPS : secondaryIconProps
            }
            onPress={() => {
              if (entrypointLayout === 'swap_buy') {
                handleOpenQuickBuy('buy');
                return;
              }
              trackStickyFooterTapped({
                ctaType: 'swap',
                balanceFiatUsd,
                tokenAddress: token.address ?? '',
                chainId: token.chainId ?? '',
                indicatorsActive,
              });
              handleFooterAction(
                onSwap,
                strings('asset_overview.swap'),
                onSwapPress,
              );
            }}
          >
            {strings('asset_overview.swap')}
          </Button>
        )}
        {moneyDepositButton}
        {showBuyButton && !isBuySellLayout && (
          <Button
            testID={buyTestID}
            variant={
              buyIsSuccess ? ButtonVariant.Primary : ButtonVariant.Secondary
            }
            style={styles.iconButton}
            twClassName={
              buyIsSuccess ? successBg : `bg-transparent ${successBorder}`
            }
            textProps={buyIsSuccess ? SUCCESS_TEXT_PROPS : secondaryTextProps}
            startIconName={IconName.Bank}
            startIconProps={
              buyIsSuccess ? PRIMARY_ICON_PROPS : secondaryIconProps
            }
            onPress={() => {
              trackStickyFooterTapped({
                ctaType: 'buy',
                balanceFiatUsd,
                tokenAddress: token.address ?? '',
                chainId: token.chainId ?? '',
                indicatorsActive,
              });
              handleFooterAction(onBuy, buyButtonLabel, onBuyPress);
            }}
          >
            {buyButtonLabel}
          </Button>
        )}
        {isBuySellLayout && hasTokenBalance && (
          <Button
            testID="token-details-footer-quick-sell"
            variant={ButtonVariant.Primary}
            style={styles.iconButton}
            twClassName="bg-error-default"
            textProps={ERROR_TEXT_PROPS}
            onPress={() => handleOpenQuickBuy('sell')}
          >
            {strings('asset_overview.sell_button')}
          </Button>
        )}
        {isBuySellLayout && (
          <Button
            testID="token-details-footer-quick-buy"
            variant={ButtonVariant.Primary}
            style={styles.iconButton}
            twClassName={successBg}
            textProps={SUCCESS_TEXT_PROPS}
            onPress={() => handleOpenQuickBuy('buy')}
          >
            {buyButtonLabel}
          </Button>
        )}
        {showQuickBuyButton && entrypointLayout === 'lightning_swap_buy' && (
          <ButtonAnimated
            testID={quickBuyTestID}
            accessibilityRole="button"
            accessibilityLabel={strings('asset_overview.buy_button')}
            style={[styles.quickBuyButton, { borderColor: successColorHex }]}
            onPress={() => {
              if (!onQuickBuyPress) return;
              trackStickyFooterTapped({
                ctaType: 'quick_buy',
                balanceFiatUsd,
                tokenAddress: token.address ?? '',
                chainId: token.chainId ?? '',
                indicatorsActive,
              });
              handleFooterAction(
                onQuickBuyPress,
                strings('asset_overview.buy_button'),
              );
            }}
          >
            <Icon
              name={IconName.FlashFilled}
              size={IconSize.Md}
              twClassName={successText}
            />
          </ButtonAnimated>
        )}
      </View>
      {isMoneyDepositCtaActive && !moneyDepositCta?.isLoading && (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {strings('money.asset_overview.cta.current_apy_disclaimer')}
        </Text>
      )}
    </>
  );

  return (
    <>
      {isTraderPositionExpanded && (
        <BottomSheetOverlay testID="token-details-trader-position-pnl-overlay" />
      )}
      <BottomSheetDialog
        testID="token-details-sticky-footer"
        isInteractable={false}
        style={bottomSheetStyle}
      >
        <GestureDetector gesture={sheetGesture}>
          <View
            testID="token-details-sticky-footer-surface"
            style={footerStyle}
          >
            {isTraderPositionExpanded && (
              <Box
                testID="token-details-trader-position-pnl-handle"
                twClassName="absolute inset-x-0 top-1 z-10 items-center"
              >
                <Box twClassName="h-1 w-10 rounded-sm bg-border-muted" />
              </Box>
            )}
            {positionContent}
            {footerActions}
          </View>
        </GestureDetector>
      </BottomSheetDialog>
      <RwaUnavailableBottomSheet ref={rwaUnavailableSheetRef} />
      {networkModal}
    </>
  );
};

export default TokenDetailsStickyFooter;
