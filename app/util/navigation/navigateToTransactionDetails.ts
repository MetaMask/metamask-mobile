import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import Routes from '../../constants/navigation/Routes';
import type {
  ActivityTypeFilter,
  PerpsActivityFilter,
} from '../../components/Views/ActivityScreen/types';
import type { ActivityDetailsParams } from '../../components/Views/ActivityDetails/ActivityDetails.types';

interface NavigateToTransactionDetailsOptions {
  /** Transaction id/hash to open. When omitted, only the activity list opens. */
  transactionId?: string;
  /**
   * Pre-selects the activity list's type filter (e.g. Predictions), so the list
   * shown behind the details — and returned to on "back" — is already filtered.
   */
  initialTypeFilter?: ActivityTypeFilter;
  initialPerpsFilter?: PerpsActivityFilter;
  /**
   * Whether the redesigned details screen is enabled
   * (`selectIsTransactionsRedesignEnabled`). Callers read the flag themselves so
   * this module stays store-free; passing it keeps toast entry points on the same
   * destination the activity list already uses for the very same row.
   */
  isTransactionsRedesignEnabled?: boolean;
  /**
   * CAIP-2 chain id of `transactionId`. Required by the redesigned screen, which
   * re-resolves the row per chain. Without it the legacy screen is used, since
   * an unfiltered lookup could resolve a hash that collides across chains.
   */
  chainId?: CaipChainId;
}

/**
 * Opens a transaction's details from anywhere (e.g. a global toast or a legacy
 * row), landing on the (optionally filtered) activity list first so "back"
 * returns there rather than to the caller.
 *
 * With the redesign enabled (and a `chainId` to resolve the row on) this opens
 * `ACTIVITY_DETAILS`, matching where the activity list sends the same row; it
 * otherwise falls back to the confirmations team's `TRANSACTION_DETAILS`. The
 * redesigned screen resolves local rows by `TransactionMeta.id`, which is what
 * callers here hold, so it needs no out-of-band row hand-off.
 *
 * All of `TRANSACTIONS_VIEW`, `ACTIVITY_DETAILS` and `TRANSACTION_DETAILS` are
 * reachable from the root navigator, so the two navigations resolve immediately
 * — no mount-order `setTimeout` is needed (unlike the previous per-call-site
 * workaround).
 */
export function navigateToTransactionDetails(
  // Only `navigate` is needed; Pick avoids coupling to the caller's exact
  // NavigationProp variant (hooks override `getState`, class props differ).
  navigation: Pick<NavigationProp<ParamListBase>, 'navigate'>,
  {
    transactionId,
    initialTypeFilter,
    initialPerpsFilter,
    isTransactionsRedesignEnabled,
    chainId,
  }: NavigateToTransactionDetailsOptions = {},
): void {
  if (initialTypeFilter) {
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        initialTypeFilter,
        ...(initialPerpsFilter ? { initialPerpsFilter } : {}),
      },
    });
  } else {
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }
  if (!transactionId) {
    return;
  }
  if (isTransactionsRedesignEnabled && chainId) {
    const params: ActivityDetailsParams = {
      chainId,
      txIdentifier: transactionId,
    };
    navigation.navigate(Routes.ACTIVITY_DETAILS, params);
    return;
  }
  navigation.navigate(Routes.TRANSACTION_DETAILS, { transactionId });
}
