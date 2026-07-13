import type { TokenSecurityData } from '@metamask/assets-controllers';
import {
  Button,
  ButtonAnimated,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
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
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import type { BridgeToken } from '../../Bridge/types';
import useTokenBuyability from '../../Ramp/hooks/useTokenBuyability';
import { getResultTypeConfig } from '../../SecurityTrust/utils/securityUtils';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useStickyFooterTracking } from '../hooks/useStickyFooterTracking';
import { useStickyTokenActions } from '../hooks/useStickyTokenActions';
import { AMBIENT_NEGATIVE_COLOR } from './abTestConfig';
import RwaUnavailableBottomSheet, {
  type RwaUnavailableBottomSheetRef,
} from './RwaUnavailableBottomSheet/RwaUnavailableBottomSheet';

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  button: {
    flex: 1,
  },
  subsequentButton: {
    flex: 1,
    marginLeft: 16,
  },
  quickBuyButton: {
    width: 48,
    height: 48,
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
  },
});

const BALANCE_THRESHOLD_USD = 100;

const SUCCESS_TEXT_PROPS = { color: TextColor.SuccessInverse } as const;
const PRIMARY_ICON_PROPS = { size: IconSize.Md } as const;

interface TokenStickyFooterProps {
  token: TokenDetailsRouteParams;
  securityData?: TokenSecurityData | null | undefined;
  /** Token balance in USD, currency-agnostic. Used to determine which button gets the success style. */
  balanceFiatUsd?: number | undefined;
  /** Network name passed through to useTokenActions */
  networkName?: string;
  /** Up-to-date token balance for useTokenActions swap logic */
  currentTokenBalance?: string;
  onStickyButtonsResolved?: (shown: 'both' | 'buy' | 'swap' | null) => void;
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
  /** When true, use success (green) accent; when false, use error (red) accent. Null means not yet resolved. */
  isPricePositive?: boolean | null;
  /** Whether the ambient price color A/B test treatment is active. */
  useAmbientColor?: boolean;
}

const TokenDetailsStickyFooter: React.FC<TokenStickyFooterProps> = ({
  token,
  securityData,
  balanceFiatUsd,
  networkName,
  currentTokenBalance,
  onStickyButtonsResolved,
  skipBottomInset = false,
  swapTestID,
  buyTestID,
  onSwapPress,
  onBuyPress,
  onQuickBuyPress,
  quickBuyTestID,
  sourcePage,
  isPricePositive = null,
  useAmbientColor = false,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, themeAppearance } = useTheme();
  const isLightMode = themeAppearance === AppThemeKey.light;

  const { indicators: indicatorsActive } = useTokenChartPreferences();

  const useErrorAccent = useAmbientColor && isPricePositive === false;

  const getSuccessClass = (prefix: string, defaultClass: string) => {
    if (useErrorAccent) {
      return `${prefix}-[${AMBIENT_NEGATIVE_COLOR}]`;
    }
    if (isLightMode) {
      return `${prefix}-[${LIGHT_MODE_SUCCESS_GREEN}]`;
    }
    return defaultClass;
  };

  const successBg = getSuccessClass('bg', 'bg-success-default');
  const successBorder = getSuccessClass('border', 'border-success-default');
  const successText = getSuccessClass('text', 'text-success-default');

  const successColorHex = useErrorAccent
    ? AMBIENT_NEGATIVE_COLOR
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

  const geolocation = useSelector(getDetectedGeolocation);
  const isRwaGeoRestricted = useMemo(() => {
    if (!isStockToken(token as BridgeToken)) return false;
    if (__DEV__) return false;
    const country = geolocation?.toUpperCase().split('-')[0];
    return !country || ONDO_RESTRICTED_COUNTRIES.has(country);
  }, [isStockToken, token, geolocation]);

  const rwaUnavailableSheetRef = useRef<RwaUnavailableBottomSheetRef>(null);

  const trackStickyFooterTapped = useStickyFooterTracking();

  const showSwapButton = hasEligibleSwapTokens;
  const showBuyButton = isBuyable || !hasEligibleSwapTokens;
  const showBothButtons = showSwapButton && showBuyButton;
  const showQuickBuyButton = Boolean(onQuickBuyPress) && hasEligibleSwapTokens;

  const tradingOpen = isTokenTradingOpen(token as BridgeToken);
  useEffect(() => {
    if (onStickyButtonsResolved) {
      if (!tradingOpen) {
        onStickyButtonsResolved(null);
        return;
      }
      const shown = showBothButtons ? 'both' : showSwapButton ? 'swap' : 'buy';
      onStickyButtonsResolved(shown);
    }
  }, [tradingOpen, showBothButtons, showSwapButton, onStickyButtonsResolved]);

  const balanceUsd = balanceFiatUsd ?? 0;

  /**
   * When only one button is shown it always gets the success style.
   * When both are shown, swap gets success if balance >= $100, buy gets success otherwise.
   */
  const swapIsSuccess = showBothButtons
    ? balanceUsd >= BALANCE_THRESHOLD_USD
    : showSwapButton;
  const buyIsSuccess = showBothButtons ? !swapIsSuccess : showBuyButton;

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

  return (
    <>
      <View testID="bottomsheetfooter" style={[styles.footer, footerStyle]}>
        {showSwapButton && (
          <Button
            testID={swapTestID}
            variant={
              swapIsSuccess ? ButtonVariant.Primary : ButtonVariant.Secondary
            }
            style={styles.button}
            twClassName={
              swapIsSuccess ? successBg : `bg-transparent ${successBorder}`
            }
            textProps={swapIsSuccess ? SUCCESS_TEXT_PROPS : secondaryTextProps}
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
        {showBuyButton && (
          <Button
            testID={buyTestID}
            variant={
              buyIsSuccess ? ButtonVariant.Primary : ButtonVariant.Secondary
            }
            style={showSwapButton ? styles.subsequentButton : styles.button}
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
      <RwaUnavailableBottomSheet ref={rwaUnavailableSheetRef} />
      {networkModal}
    </>
  );
};

export default TokenDetailsStickyFooter;
