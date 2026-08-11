import type { TokenSecurityData } from '@metamask/assets-controllers';
import {
  Button,
  ButtonAnimated,
  ButtonVariant,
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
import { StyleSheet, View } from 'react-native';
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
import RwaUnavailableBottomSheet, {
  type RwaUnavailableBottomSheetRef,
} from './RwaUnavailableBottomSheet/RwaUnavailableBottomSheet';

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
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
  earnButton: {
    flex: 1,
    paddingLeft: 0,
    paddingRight: 0,
  },
});

const BALANCE_THRESHOLD_USD = 100;

const SUCCESS_TEXT_PROPS = { color: TextColor.SuccessInverse } as const;
const PRIMARY_ICON_PROPS = { size: IconSize.Md } as const;

type StickyButtonLayout =
  | 'both'
  | 'buy'
  | 'swap'
  | 'swap_earn'
  | 'earn_buy'
  | 'earn'
  | null;

export interface MoneyEarnCtaConfig {
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
  moneyEarnCta?: MoneyEarnCtaConfig;
  onStickyButtonsResolved?: (shown: StickyButtonLayout) => void;
  /** When true the footer omits its built-in safe-area bottom inset so the parent can manage spacing. */
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
  /** Page name sent with swap/bridge analytics. Defaults to `'MainView'`. */
  sourcePage?: string;
  /** Whether the ambient price color A/B test treatment is active. */
  useAmbientColor?: boolean;
}

const TokenDetailsStickyFooter: React.FC<TokenStickyFooterProps> = ({
  token,
  securityData,
  balanceFiatUsd,
  networkName,
  currentTokenBalance,
  hasTokenBalance = false,
  moneyEarnCta,
  onStickyButtonsResolved,
  skipBottomInset = false,
  swapTestID,
  buyTestID,
  onSwapPress,
  onBuyPress,
  onQuickBuyPress,
  quickBuyTestID,
  sourcePage,
  useAmbientColor = false,
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
  const { isTokenTradingOpen, isStockToken } = useRWAToken();

  const isRwaGeoRestricted = useMemo(() => {
    if (!isStockToken(token as BridgeToken)) return false;
    if (__DEV__) return false;
    const country = geolocation?.toUpperCase().split('-')[0];
    return !country || ONDO_RESTRICTED_COUNTRIES.has(country);
  }, [isStockToken, token, geolocation]);

  const rwaUnavailableSheetRef = useRef<RwaUnavailableBottomSheetRef>(null);

  const trackStickyFooterTapped = useStickyFooterTracking();

  const isMoneyEarnCtaActive = Boolean(moneyEarnCta);
  const showSwapButton = isMoneyEarnCtaActive
    ? hasTokenBalance && hasEligibleSwapTokens
    : hasEligibleSwapTokens;
  const showBuyButton = isMoneyEarnCtaActive
    ? !hasTokenBalance && (isBuyable || !hasEligibleSwapTokens)
    : isBuyable || !hasEligibleSwapTokens;
  const showMoneyEarnButton = isMoneyEarnCtaActive;
  const showBothButtons = showSwapButton && showBuyButton;
  const showQuickBuyButton =
    !isMoneyEarnCtaActive && Boolean(onQuickBuyPress) && hasEligibleSwapTokens;

  const tradingOpen = isTokenTradingOpen(token as BridgeToken);
  useEffect(() => {
    if (onStickyButtonsResolved) {
      if (!tradingOpen) {
        onStickyButtonsResolved(null);
        return;
      }
      const shown: StickyButtonLayout = isMoneyEarnCtaActive
        ? showSwapButton
          ? 'swap_earn'
          : showBuyButton
            ? 'earn_buy'
            : 'earn'
        : showBothButtons
          ? 'both'
          : showSwapButton
            ? 'swap'
            : 'buy';
      onStickyButtonsResolved(shown);
    }
  }, [
    isMoneyEarnCtaActive,
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
  const swapIsSuccess = isMoneyEarnCtaActive
    ? false
    : showBothButtons
      ? balanceUsd >= BALANCE_THRESHOLD_USD
      : showSwapButton;
  const buyIsSuccess = isMoneyEarnCtaActive
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

  const footerStyle = useMemo(
    () => ({
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: skipBottomInset ? 4 : insets.bottom + 6,
    }),
    [colors.background.default, insets.bottom, skipBottomInset],
  );

  if (!tradingOpen) return null;

  const moneyEarnButton = showMoneyEarnButton ? (
    <Button
      testID="money-asset-overview-footer-cta"
      variant={
        hasTokenBalance ? ButtonVariant.Primary : ButtonVariant.Secondary
      }
      style={styles.earnButton}
      twClassName={
        hasTokenBalance ? successBg : `bg-transparent ${successBorder}`
      }
      textProps={hasTokenBalance ? SUCCESS_TEXT_PROPS : secondaryTextProps}
      isLoading={moneyEarnCta?.isLoading}
      onPress={() => {
        if (!moneyEarnCta?.label) return;

        trackStickyFooterTapped({
          ctaType: 'money_deposit',
          balanceFiatUsd,
          tokenAddress: token.address ?? '',
          chainId: token.chainId ?? '',
          indicatorsActive,
        });
        handleFooterAction(moneyEarnCta.onPress, moneyEarnCta.label);
      }}
    >
      {moneyEarnCta?.label}
    </Button>
  ) : null;

  return (
    <>
      <View style={footerStyle}>
        <View testID="bottomsheetfooter" style={styles.footer}>
          {showSwapButton && (
            <Button
              testID={swapTestID}
              variant={
                swapIsSuccess ? ButtonVariant.Primary : ButtonVariant.Secondary
              }
              style={styles.iconButton}
              twClassName={
                swapIsSuccess ? successBg : `bg-transparent ${successBorder}`
              }
              textProps={
                swapIsSuccess ? SUCCESS_TEXT_PROPS : secondaryTextProps
              }
              startIconName={IconName.SwapVertical}
              startIconProps={
                swapIsSuccess ? PRIMARY_ICON_PROPS : secondaryIconProps
              }
              onPress={() => {
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
          {!hasTokenBalance && moneyEarnButton}
          {showBuyButton && (
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
                handleFooterAction(
                  onBuy,
                  strings('asset_overview.buy_button'),
                  onBuyPress,
                );
              }}
            >
              {strings('asset_overview.buy_button')}
            </Button>
          )}
          {hasTokenBalance && moneyEarnButton}
          {showQuickBuyButton && (
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
        {isMoneyEarnCtaActive && !moneyEarnCta?.isLoading && (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="mt-2 text-center"
          >
            {strings('money.asset_overview.cta.current_apy_disclaimer')}
          </Text>
        )}
      </View>
      <RwaUnavailableBottomSheet ref={rwaUnavailableSheetRef} />
      {networkModal}
    </>
  );
};

export default TokenDetailsStickyFooter;
