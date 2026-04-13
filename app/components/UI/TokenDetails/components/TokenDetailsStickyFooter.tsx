import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  ButtonVariant,
  IconName,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import useTokenBuyability from '../../Ramp/hooks/useTokenBuyability';
import Routes from '../../../../constants/navigation/Routes';
import type { BridgeToken } from '../../Bridge/types';
import type { TokenDetailsRouteParams } from '../constants/constants';

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
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

/** Parses a fiat balance string like "$1,234.56" into a number, returns 0 on failure. */
function parseFiatBalance(fiatBalance: string | undefined): number {
  if (!fiatBalance) return 0;
  const parsed = parseFloat(fiatBalance.replace(/[^0-9.]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

interface TokenStickyFooterProps {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | null | undefined;
  /** Formatted fiat balance string e.g. "$150.00". Used to determine which button gets the success style. */
  fiatBalance: string | undefined;
  /** Action handlers from parent's useTokenActions hook */
  onBuy: () => void;
  onSwap: () => void;
  hasEligibleSwapTokens: boolean;
}

const TokenDetailsStickyFooter: React.FC<TokenStickyFooterProps> = ({
  token,
  securityData,
  fiatBalance,
  onBuy,
  onSwap,
  hasEligibleSwapTokens,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { isBuyable } = useTokenBuyability(token);
  const { isTokenTradingOpen } = useRWAToken();

  const showSwapButton = hasEligibleSwapTokens;
  const showBuyButton = isBuyable || !hasEligibleSwapTokens;
  const showBothButtons = showSwapButton && showBuyButton;

  const balanceUsd = useMemo(
    () => parseFiatBalance(fiatBalance),
    [fiatBalance],
  );

  /**
   * When only one button is shown it always gets the success style.
   * When both are shown, swap gets success if balance >= $100, buy gets success otherwise.
   */
  const swapIsSuccess = showBothButtons
    ? balanceUsd >= BALANCE_THRESHOLD_USD
    : showSwapButton;
  const buyIsSuccess = showBothButtons ? !swapIsSuccess : showBuyButton;

  const successTextProps = useMemo(
    () => ({ color: TextColor.SuccessInverse }),
    [],
  );

  const handleFooterAction = useCallback(
    (action: () => void, source: string) => {
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
      navigation,
      securityData?.resultType,
      token.symbol,
      token.address,
      token.chainId,
    ],
  );

  const footerStyle = React.useMemo(
    () => ({
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: insets.bottom + 6,
    }),
    [colors.background.default, insets.bottom],
  );

  return (
    <>
      {isTokenTradingOpen(token as BridgeToken) && (
        <View testID="bottomsheetfooter" style={[styles.footer, footerStyle]}>
          {showSwapButton && (
            <Button
              variant={
                swapIsSuccess ? ButtonVariant.Primary : ButtonVariant.Secondary
              }
              style={styles.button}
              twClassName={swapIsSuccess ? 'bg-success-default' : undefined}
              textProps={swapIsSuccess ? successTextProps : undefined}
              startIconName={IconName.SwapVertical}
              onPress={() =>
                handleFooterAction(onSwap, strings('asset_overview.swap'))
              }
            >
              {strings('asset_overview.swap')}
            </Button>
          )}
          {showBuyButton && (
            <Button
              variant={
                buyIsSuccess ? ButtonVariant.Primary : ButtonVariant.Secondary
              }
              style={showSwapButton ? styles.subsequentButton : styles.button}
              twClassName={buyIsSuccess ? 'bg-success-default' : undefined}
              textProps={buyIsSuccess ? successTextProps : undefined}
              startIconName={IconName.Add}
              onPress={() =>
                handleFooterAction(onBuy, strings('asset_overview.buy_button'))
              }
            >
              {strings('asset_overview.buy_button')}
            </Button>
          )}
        </View>
      )}
    </>
  );
};

export default TokenDetailsStickyFooter;
