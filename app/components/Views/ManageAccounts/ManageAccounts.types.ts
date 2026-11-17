import type { ManageAccountsViewedSource } from '../../../core/Analytics/events/accounts';

/**
 * Route params for `Routes.MANAGE_ACCOUNTS_VIEW`.
 */
export interface ManageAccountsParams {
  /**
   * Entry point that opened the screen, reported as `source` on the
   * `Manage Accounts Viewed` event. Defaults to
   * `ManageAccountsViewedSource.AccountList` when a caller omits it.
   */
  source?: ManageAccountsViewedSource;
}
