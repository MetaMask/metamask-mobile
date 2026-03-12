import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconName, IconColor } from '@metamask/design-system-react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useTokenActions } from '../hooks/useTokenActions';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { getIsSwapsAssetAllowed } from '../../../Views/Asset/utils';
import AppConstants from '../../../../core/AppConstants';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../constants/navigation/Routes';
import type { BridgeToken } from '../../Bridge/types';
import type { TokenDetailsRouteParams } from '../constants/constants';

interface TokenStickyFooterProps {
  token: TokenDetailsRouteParams;
  securityData: TokenSecurityData | null | undefined;
  networkName: string | undefined;
}

const TokenDetailsStickyFooter: React.FC<TokenStickyFooterProps> = ({
  token,
  securityData,
  networkName,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { handleBuyPress, handleSellPress, networkModal } = useTokenActions({
    token,
    networkName,
  });

  const { balance } = useTokenBalance(token);
  const { isTokenTradingOpen } = useRWAToken();

  const isSwapsAssetAllowed = getIsSwapsAssetAllowed({
    asset: {
      isETH: token.isETH ?? false,
      isNative: token.isNative ?? false,
      address: token.address ?? '',
      chainId: token.chainId ?? '',
    },
  });
  const displaySwapsButton = isSwapsAssetAllowed && AppConstants.SWAPS.ACTIVE;

  const handleFooterAction = useCallback(
    (action: () => void) => {
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
        params: { ...config, onProceed: action },
      });
    },
    [navigation, securityData?.resultType, token.symbol],
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
      {networkModal}
      {displaySwapsButton && isTokenTradingOpen(token as BridgeToken) && (
        <BottomSheetFooter
          style={footerStyle}
          buttonPropsArray={[
            {
              variant: ButtonVariants.Primary,
              label: strings('asset_overview.buy_button'),
              size: ButtonSize.Lg,
              onPress: () => handleFooterAction(handleBuyPress),
            },
            ...(balance && parseFloat(String(balance)) > 0
              ? [
                  {
                    variant: ButtonVariants.Primary,
                    label: strings('asset_overview.sell_button'),
                    size: ButtonSize.Lg,
                    onPress: () => handleFooterAction(handleSellPress),
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
