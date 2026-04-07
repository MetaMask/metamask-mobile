import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconName, IconColor } from '@metamask/design-system-react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import useTokenBuyability from '../../Ramp/hooks/useTokenBuyability';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import type { BridgeToken } from '../../Bridge/types';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { getIsSwapsAssetAllowed } from '../../../Views/Asset/utils';

interface TokenStickyFooterProps {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | null | undefined;
  /** Action handlers from parent's useTokenActions hook */
  onBuy: () => void;
  onSwap: () => void;
  hasEligibleSwapTokens: boolean;
}

const TokenDetailsStickyFooter: React.FC<TokenStickyFooterProps> = ({
  token,
  securityData,
  onBuy,
  onSwap,
  hasEligibleSwapTokens,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { isBuyable } = useTokenBuyability(token);
  const { isTokenTradingOpen } = useRWAToken();

  const isSwapsAssetAllowed = getIsSwapsAssetAllowed({
    asset: {
      isETH: token.isETH ?? false,
      isNative: token.isNative ?? false,
      address: token.address ?? '',
      chainId: token.chainId ?? '',
    },
  });
  const hasSwapRoute =
    AppConstants.SWAPS.ACTIVE && isSwapsAssetAllowed && hasEligibleSwapTokens;
  const showSwapButton = hasSwapRoute;
  const showBuyFallback = !hasEligibleSwapTokens || !isSwapsAssetAllowed;
  const showBuyButton = isBuyable || showBuyFallback;
  const shouldRenderFooterButtons = showSwapButton || showBuyButton;

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
      {isTokenTradingOpen(token as BridgeToken) &&
        shouldRenderFooterButtons && (
          <BottomSheetFooter
            style={footerStyle}
            buttonPropsArray={[
              ...(showSwapButton
                ? [
                    {
                      variant: ButtonVariants.Primary,
                      label: strings('asset_overview.swap'),
                      size: ButtonSize.Lg,
                      onPress: () =>
                        handleFooterAction(
                          onSwap,
                          strings('asset_overview.swap'),
                        ),
                    },
                  ]
                : []),
              ...(showBuyButton
                ? [
                    {
                      variant: ButtonVariants.Primary,
                      label: strings('asset_overview.buy_button'),
                      size: ButtonSize.Lg,
                      onPress: () =>
                        handleFooterAction(
                          onBuy,
                          strings('asset_overview.buy_button'),
                        ),
                    },
                  ]
                : []),
            ]}
            buttonsAlignment={ButtonsAlignment.Horizontal}
          />
        )}
    </>
  );
};

export default TokenDetailsStickyFooter;
