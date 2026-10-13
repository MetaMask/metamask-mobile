import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  parseCaipAssetType,
  type CaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import { anyScopesMatch } from '../../../hooks/useAccountGroupsForPermissions/utils';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';

/**
 * CAIP-2 chain of a CAIP-19 asset id, or `undefined` when the id is absent or
 * unparseable.
 */
export const assetChainScope = (
  assetId: CaipAssetType | null | undefined,
): CaipChainId | undefined => {
  if (!assetId) {
    return undefined;
  }

  try {
    return parseCaipAssetType(assetId).chainId;
  } catch {
    return undefined;
  }
};

/**
 * Wallet address to ask the open-position route about, for one asset.
 *
 * The address and the asset id must describe the same chain, so the account of
 * the selected group that holds this asset's scope wins. The globally selected
 * account is only a fallback, and only when its own scopes cover that chain —
 * pairing, say, an EVM address with a Solana asset would return a 403 or 404
 * that the caller cannot tell apart from "this wallet holds no position".
 *
 * Returns `undefined` when no account covers the scope, which leaves the footer
 * on the wallet balance instead of querying a wallet that cannot match.
 */
export const resolveOpenPositionWallet = ({
  scope,
  scopedAccount,
  selectedAccount,
}: {
  scope: CaipChainId | undefined;
  scopedAccount: InternalAccount | undefined;
  selectedAccount: InternalAccount | undefined;
}): string | undefined => {
  if (!scope) {
    return undefined;
  }

  if (scopedAccount) {
    return getFormattedAddressFromInternalAccount(scopedAccount);
  }

  if (selectedAccount && anyScopesMatch(selectedAccount.scopes ?? [], scope)) {
    return getFormattedAddressFromInternalAccount(selectedAccount);
  }

  return undefined;
};
