import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { createSelector } from 'reselect';

import type { RootState } from '../../../../../../../reducers';
import { getAssetsBalance } from '../../../../../../../selectors/assets/assets-controller';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { PACK_PARTNER_SCOPE, SOLANA_USDC_ASSET_ID } from '../../constants';

/**
 * Solana mainnet account of the selected account group.
 *
 * @param state - Redux state.
 * @returns The internal account, or undefined when the group has none.
 */
export const selectPackPartnerInternalAccount = (
  state: RootState,
): InternalAccount | undefined =>
  selectSelectedInternalAccountByScope(state)(PACK_PARTNER_SCOPE);

/**
 * Human-readable USDC amount of an account in raw AssetsController balances.
 * Unlike `AssetsController.getAssets`, it keeps hidden and metadata-less USDC,
 * so the displayed balance and a refreshed balance read the same value.
 *
 * @param assetsBalance - `AssetsController` balances by account id.
 * @param accountId - Internal account id.
 * @returns The amount, e.g. "12.5", or undefined without a balance entry.
 */
export const getPackPartnerUsdcAmount = (
  assetsBalance: AssetsControllerState['assetsBalance'],
  accountId: string | undefined,
): string | undefined =>
  accountId
    ? assetsBalance[accountId]?.[SOLANA_USDC_ASSET_ID]?.amount
    : undefined;

/** Human-readable USDC amount of the selected Solana account. */
export const selectPackPartnerUsdcAmount: (
  state: RootState,
) => string | undefined = createSelector(
  [getAssetsBalance, selectPackPartnerInternalAccount],
  (assetsBalance, account) =>
    getPackPartnerUsdcAmount(assetsBalance, account?.id),
);
