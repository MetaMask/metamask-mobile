import { Caip19AssetId } from '@metamask/assets-controller';
import { parseCaipAssetType, toCaipAccountId } from '@metamask/utils';
import { getFormattedAddressFromInternalAccount } from '../../../../../../core/Multichain/utils';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';

/**
 * Resolves the CAIP-10 account id of the delegator (the current user) on the
 * source asset's chain.
 *
 * @param sourceAssetId - The CAIP-19 asset id being sold, used to derive the chain.
 * @param getSelectedAccountByScope - Selector callback resolving the selected account for a scope.
 * @returns The CAIP-10 account id, or `undefined` if it cannot be resolved.
 */
export function getDelegatorAccountId(
  sourceAssetId: Caip19AssetId,
  getSelectedAccountByScope: ReturnType<
    typeof selectSelectedInternalAccountByScope
  >,
): string | undefined {
  try {
    const { chainId, chain } = parseCaipAssetType(sourceAssetId);
    const selectedAccount = getSelectedAccountByScope(chainId);

    if (!selectedAccount) {
      return undefined;
    }

    const address = getFormattedAddressFromInternalAccount(selectedAccount);

    return toCaipAccountId(chain.namespace, chain.reference, address);
  } catch (error) {
    console.warn(
      'getDelegatorAccountId: Failed to resolve delegator account',
      error,
    );
    return undefined;
  }
}
