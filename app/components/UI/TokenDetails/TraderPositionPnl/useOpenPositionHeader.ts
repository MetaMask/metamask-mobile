import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import {
  toOpenPositionHeader,
  type OpenPositionHeaderModel,
} from './openPositionHeader';
import {
  assetChainScope,
  resolveOpenPositionWallet,
} from './openPositionWallet';
import { useOpenPositionForAsset } from './useOpenPositionForAsset';
import { useUsdToFiatRate } from './useUsdToFiatRate';

/**
 * Header model for the meme-page sticky footer.
 * The asset is the token's CAIP-19 id, and the wallet is the selected group's
 * account on that asset's chain.
 */
export const useOpenPositionHeader = (
  token: TokenDetailsRouteParams,
): OpenPositionHeaderModel => {
  const assetId = useTokenCaipAssetId(token);
  const scope = useMemo(() => assetChainScope(assetId), [assetId]);

  // Both selectors return a memoized account reference, so the checksumming in
  // resolveOpenPositionWallet runs on an account change rather than per action.
  const scopedAccount = useSelector((state: RootState) =>
    scope ? selectSelectedInternalAccountByScope(state)(scope) : undefined,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const address = useMemo(
    () => resolveOpenPositionWallet({ scope, scopedAccount, selectedAccount }),
    [scope, scopedAccount, selectedAccount],
  );

  const { position, isLoading } = useOpenPositionForAsset(
    address,
    assetId ?? undefined,
  );
  const { fiatBalance } = useTokenBalance(token);
  const conversion = useUsdToFiatRate();

  return toOpenPositionHeader({
    position,
    isLoading,
    walletFiatBalance: fiatBalance,
    conversion,
  });
};
