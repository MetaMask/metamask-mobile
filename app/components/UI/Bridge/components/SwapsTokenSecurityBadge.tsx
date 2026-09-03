import React, { useMemo } from 'react';
import type { CaipAssetType } from '@metamask/utils';
import { Icon, IconSize } from '@metamask/design-system-react-native';

import { getResultTypeConfig } from '../../SecurityTrust/utils/securityUtils';
import { useTokenListSecurityBadgeQuery } from '../../Tokens/hooks/useTokenListSecurityBadgeQuery';

export interface SwapsTokenSecurityBadgeProps {
  caipAssetId: CaipAssetType;
}

const SwapsTokenSecurityBadge = ({
  caipAssetId,
}: SwapsTokenSecurityBadgeProps) => {
  const { data: securityData } = useTokenListSecurityBadgeQuery(caipAssetId);

  const verifiedBadge = useMemo(() => {
    if (securityData?.resultType !== 'Verified') return null;

    return getResultTypeConfig(securityData.resultType).badge;
  }, [securityData?.resultType]);

  if (!verifiedBadge) return null;

  return (
    <Icon
      name={verifiedBadge.icon}
      size={IconSize.Md}
      color={verifiedBadge.iconColor}
      testID="swaps-token-verified-icon"
    />
  );
};

export default React.memo(SwapsTokenSecurityBadge);
