import type { AccountListStats } from '../../../../selectors/multichainAccounts/manageAccounts';
import type { ManageAccountsViewedSource } from './constants';

/**
 * Build the `Manage Accounts Viewed` properties from the entry point and the
 * account tree totals. All four are required by the Segment schema, so none of
 * them may be left off — including when a count is zero.
 *
 * @param source - Entry point that opened the management view.
 * @param stats - Account, wallet and hidden totals for the whole tree.
 * @returns The event properties in their schema-defined snake_case shape.
 */
export const buildManageAccountsViewedProperties = (
  source: ManageAccountsViewedSource,
  stats: AccountListStats,
) => ({
  source,
  total_accounts: stats.totalAccounts,
  total_wallets: stats.totalWallets,
  hidden_count: stats.hiddenCount,
});
