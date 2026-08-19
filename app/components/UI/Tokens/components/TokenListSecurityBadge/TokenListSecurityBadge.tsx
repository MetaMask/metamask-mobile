import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CaipAssetType } from '@metamask/utils';

import SkeletonText from '../../../Ramp/Aggregator/components/SkeletonText';
import SecurityTrustInlineBadge from '../../../SecurityTrust/components/SecurityTrustInlineBadge/SecurityTrustInlineBadge';
import { getResultTypeConfig } from '../../../SecurityTrust/utils/securityUtils';
import { useTokenListSecurityBadgeQuery } from '../../hooks/useTokenListSecurityBadgeQuery';

export interface TokenListSecurityBadgeProps {
  caipAssetId: CaipAssetType;
}

const loadingSkeletonStyle = StyleSheet.create({
  placeholder: {
    width: 52,
    height: 20,
    padding: 0,
    borderRadius: 6,
  },
});

/** Inline security badge for the main token list (shared markup with trending rows). */
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
      <View accessibilityLabel="Token security loading" accessible>
        <SkeletonText thin style={loadingSkeletonStyle.placeholder} />
      </View>
    );
  }

  if (!securityBadge) {
    return null;
  }

  return (
    <SecurityTrustInlineBadge
      badge={securityBadge}
      iconTestID="token-list-security-badge-icon"
    />
  );
};

export default React.memo(TokenListSecurityBadge);
