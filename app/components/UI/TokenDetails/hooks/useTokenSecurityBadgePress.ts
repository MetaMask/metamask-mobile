import type { TokenSecurityData } from '@metamask/assets-controllers';
import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { getResultTypeConfig } from '../../SecurityTrust/utils/securityUtils';
import type { TokenDetailsRouteParams } from '../constants/constants';

export const useTokenSecurityBadgePress = (
  token: TokenDetailsRouteParams,
  securityData: TokenSecurityData | null | undefined,
) => {
  const navigation = useNavigation();

  const securityConfig = useMemo(
    () => getResultTypeConfig(securityData?.resultType),
    [securityData?.resultType],
  );

  const handleSecurityBadgePress = useCallback(() => {
    if (
      !securityData?.resultType ||
      securityData.resultType === 'Benign' ||
      !securityConfig.icon ||
      !securityConfig.iconColor ||
      !securityConfig.sheetTitle ||
      !securityConfig.getSheetDescription
    ) {
      return;
    }

    const isVerified = securityData.resultType === 'Verified';
    const displayIcon =
      isVerified && securityConfig.badge
        ? securityConfig.badge.icon
        : securityConfig.icon;
    const displayIconColor =
      isVerified && securityConfig.badge
        ? securityConfig.badge.iconColor
        : securityConfig.iconColor;

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
      params: {
        icon: displayIcon,
        iconColor: displayIconColor,
        title: securityConfig.sheetTitle,
        description: securityConfig.getSheetDescription(
          token.symbol || token.name,
        ),
        source: 'badge',
        severity: securityData.resultType,
        tokenAddress: token.address,
        tokenSymbol: token.symbol || token.name,
        chainId: token.chainId,
        features: securityData.features,
      },
    });
  }, [
    securityData,
    securityConfig,
    token.symbol,
    token.name,
    token.address,
    token.chainId,
    navigation,
  ]);

  return { securityConfig, handleSecurityBadgePress };
};
