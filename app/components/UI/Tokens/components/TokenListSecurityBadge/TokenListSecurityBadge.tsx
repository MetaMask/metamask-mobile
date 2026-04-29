import React, { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconAlert,
  IconSize,
  Text as DesignSystemText,
  TextVariant as DesignSystemTextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';

import { getResultTypeConfig } from '../../../SecurityTrust/utils/securityUtils';
import { useTokenListSecurityBadgeQuery } from '../../hooks/useTokenListSecurityBadgeQuery';

export interface TokenListSecurityBadgeProps {
  caipAssetId: CaipAssetType;
}

/**
 * Inline security badge for the main token list — styling matches
 * {@link TrendingTokenRowItem} (via `getResultTypeConfig().badge`).
 */
const TokenListSecurityBadge = ({
  caipAssetId,
}: TokenListSecurityBadgeProps) => {
  const {
    data: securityData,
    isLoading,
    isError,
  } = useTokenListSecurityBadgeQuery(caipAssetId);

  const securityBadge = useMemo(
    () => getResultTypeConfig(securityData?.resultType).badge,
    [securityData?.resultType],
  );

  if (isLoading && !securityData && !isError) {
    return (
      <View accessibilityLabel="Token security loading">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!securityBadge) {
    return null;
  }

  if (securityBadge.label === null) {
    return (
      <>
        {securityBadge.iconAlertSeverity ? (
          <IconAlert
            severity={securityBadge.iconAlertSeverity}
            size={IconSize.Sm}
            testID="token-list-security-badge-icon"
          />
        ) : (
          <Icon
            name={securityBadge.icon}
            size={IconSize.Sm}
            color={securityBadge.iconColor}
            testID="token-list-security-badge-icon"
          />
        )}
      </>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={`rounded min-w-[22px] px-1.5 gap-1 shrink-0 ${securityBadge.bg}`}
    >
      {securityBadge.iconAlertSeverity ? (
        <IconAlert
          severity={securityBadge.iconAlertSeverity}
          size={IconSize.Sm}
        />
      ) : (
        <Icon
          name={securityBadge.icon}
          size={IconSize.Sm}
          color={securityBadge.iconColor}
        />
      )}
      <DesignSystemText
        variant={DesignSystemTextVariant.BodySm}
        color={securityBadge.textColor}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        twClassName="whitespace-nowrap"
      >
        {securityBadge.label}
      </DesignSystemText>
    </Box>
  );
};

export default React.memo(TokenListSecurityBadge);
