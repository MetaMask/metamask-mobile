import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  ButtonVariant,
  IconName,
  IconSize,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { strings } from '../../../../../locales/i18n';
import { useTheme, LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import useTokenBuyability from '../../Ramp/hooks/useTokenBuyability';
import { useABTest } from '../../../../hooks/useABTest';
import {
  STICKY_FOOTER_SWAP_LABEL_AB_KEY,
  STICKY_FOOTER_SWAP_LABEL_VARIANTS,
} from './abTestConfig';
import { useStickyFooterTracking } from '../hooks/useStickyFooterTracking';
import Routes from '../../../../constants/navigation/Routes';
import type { BridgeToken } from '../../Bridge/types';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { ONDO_RESTRICTED_COUNTRIES } from '../../../../util/ondoGeoRestrictions';
import RwaUnavailableBottomSheet, {
  type RwaUnavailableBottomSheetRef,
} from './RwaUnavailableBottomSheet/RwaUnavailableBottomSheet';
import { useTokenActions } from '../hooks/useTokenActions';

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  button: {
    flex: 1,
  },
  subsequentButton: {
    flex: 1,
    marginLeft: 16,
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
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, themeAppearance } = useTheme();
  const isLightMode = themeAppearance === 'light';

  const successBg = isLightMode
    ? `bg-[${LIGHT_MODE_SUCCESS_GREEN}]`
    : 'bg-success-default';
  const successBorder = isLightMode
    ? `border-[${LIGHT_MODE_SUCCESS_GREEN}]`
    : 'border-success-default';
  const successText = isLightMode
    ? `text-[${LIGHT_MODE_SUCCESS_GREEN}]`
    : 'text-success-default';

  const secondaryTextProps = useMemo(
    () => ({ twClassName: successText }) as const,
    [successText],
  );
  const secondaryIconProps = useMemo(
    () =>
      ({ size: IconSize.Md, twClassName: `${successText} shrink-0` }) as const,
    [successText],
  );

  const {
    onBuy,
    handleStickySwapPress: onSwap,
    hasEligibleSwapTokens,
    networkModal,
  } = useTokenActions({
    token,
    networkName,
    currentTokenBalance,
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

  const { variant: buttonLabels } = useABTest(
    STICKY_FOOTER_SWAP_LABEL_AB_KEY,
    STICKY_FOOTER_SWAP_LABEL_VARIANTS,
  );

  const trackStickyFooterTapped = useStickyFooterTracking();

  const showSwapButton = hasEligibleSwapTokens;
  const showBuyButton = isBuyable || !hasEligibleSwapTokens;
  const showBothButtons = showSwapButton && showBuyButton;

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
    (action: () => void, source: string) => {
      if (isRwaGeoRestricted) {
        rwaUnavailableSheetRef.current?.onOpenBottomSheet();
        return;
      }

      const resultType = securityData?.resultType;

      const configMap: Record<
        string,
        {
          icon: IconName;
          iconColor: IconColor;
          title: string;
          description: string;
        }
      > = {
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
            {
              symbol: token.symbol,
            },
          ),
        },
      };

      const config = resultType ? configMap[resultType] : undefined;

      if (!config) {
        action();
        return;
      }

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: {
          ...config,
          onProceed: action,
          source,
          severity: resultType,
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          chainId: token.chainId,
        },
      });
    },
    [
      isRwaGeoRestricted,
      navigation,
      securityData?.resultType,
      token.symbol,
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
              onSwapPress?.();
              trackStickyFooterTapped({
                ctaType: 'swap',
                balanceFiatUsd,
                tokenAddress: token.address ?? '',
                chainId: token.chainId ?? '',
              });
              handleFooterAction(onSwap, strings(buttonLabels.swapLabelKey));
            }}
          >
            {strings(buttonLabels.swapLabelKey)}
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
              onBuyPress?.();
              trackStickyFooterTapped({
                ctaType: 'buy',
                balanceFiatUsd,
                tokenAddress: token.address ?? '',
                chainId: token.chainId ?? '',
              });
              handleFooterAction(onBuy, strings('asset_overview.buy_button'));
            }}
          >
            {strings('asset_overview.buy_button')}
          </Button>
        )}
      </View>
      <RwaUnavailableBottomSheet ref={rwaUnavailableSheetRef} />
      {networkModal}
    </>
  );
};

export default TokenDetailsStickyFooter;
