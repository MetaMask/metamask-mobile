import type { TokenSecurityData } from '@metamask/assets-controllers';
import { useQuery } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { useRWAToken } from '../../../../../../UI/Bridge/hooks/useRWAToken';
import SecurityTrustInlineBadge from '../../../../../../UI/SecurityTrust/components/SecurityTrustInlineBadge/SecurityTrustInlineBadge';
import { getResultTypeConfig } from '../../../../../../UI/SecurityTrust/utils/securityUtils';
import { tokenListSecurityBadgeKeys } from '../../../../../../UI/Tokens/queries/tokenSecurityBadgeKeys';
import { requestTokenSecurityForAsset } from '../../../../../../UI/Tokens/util/tokenSecurityBadgeBatch';
import { selectBasicFunctionalityEnabled } from '../../../../../../../selectors/settings';
import {
  getCaipAssetIdForBridgeToken,
  isBridgeTokenNative,
} from '../utils/getCaipAssetIdForBridgeToken';

const STALE_TIME_MS = 12 * 60 * 60 * 1000;

const VERIFIED_BADGE = getResultTypeConfig('Verified').badge;

export interface QuickBuyTokenSecurityBadgeProps {
  token: BridgeToken;
  iconTestID?: string;
}

/**
 * Inline security badge for QuickBuy token picker rows.
 * Matches token-list badge types via SecurityTrustInlineBadge, without a
 * loading skeleton — the row renders immediately and the badge appears when
 * security data is ready.
 */
const QuickBuyTokenSecurityBadge: React.FC<QuickBuyTokenSecurityBadgeProps> = ({
  token,
  iconTestID = 'quick-buy-token-security-badge-icon',
}) => {
  const basicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const { isStockToken } = useRWAToken();

  const shouldResolveBadge =
    basicFunctionalityEnabled && !isStockToken(token) && Boolean(token.chainId);

  const caipFromTokenKey = useMemo(
    () =>
      tokenListSecurityBadgeKeys.caipFromToken({
        chainId: token.chainId,
        address: token.address,
        isNative: isBridgeTokenNative(token),
        isETH: false,
      }),
    [token],
  );

  const { data: caipAssetId } = useQuery({
    queryKey: caipFromTokenKey,
    queryFn: () => getCaipAssetIdForBridgeToken(token),
    enabled: shouldResolveBadge,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const securityQueryKey = useMemo(
    () =>
      caipAssetId
        ? tokenListSecurityBadgeKeys.byAsset(caipAssetId)
        : ([
            ...tokenListSecurityBadgeKeys.all(),
            'pending',
            caipFromTokenKey,
          ] as const),
    [caipAssetId, caipFromTokenKey],
  );

  const {
    data: securityData,
    isLoading,
    isError,
    isSuccess,
  } = useQuery<TokenSecurityData | null, Error>({
    queryKey: securityQueryKey,
    queryFn: async () =>
      requestTokenSecurityForAsset(caipAssetId as CaipAssetType),
    enabled: shouldResolveBadge && Boolean(caipAssetId),
    staleTime: STALE_TIME_MS,
    cacheTime: STALE_TIME_MS,
  });

  const badge = useMemo(() => {
    if (!shouldResolveBadge) {
      return null;
    }

    if (isSuccess) {
      return getResultTypeConfig(securityData?.resultType).badge ?? null;
    }

    if (isError && token.isVerified) {
      return VERIFIED_BADGE ?? null;
    }

    if ((isLoading || !caipAssetId) && token.isVerified) {
      return VERIFIED_BADGE ?? null;
    }

    return null;
  }, [
    shouldResolveBadge,
    isSuccess,
    securityData?.resultType,
    isError,
    isLoading,
    caipAssetId,
    token.isVerified,
  ]);

  if (!badge) {
    return null;
  }

  return <SecurityTrustInlineBadge badge={badge} iconTestID={iconTestID} />;
};

export default React.memo(QuickBuyTokenSecurityBadge);
