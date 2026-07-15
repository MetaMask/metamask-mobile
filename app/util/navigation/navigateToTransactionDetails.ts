import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import type {
  ActivityTypeFilter,
  PerpsActivityFilter,
} from '../../components/Views/ActivityScreen/types';

interface NavigateToTransactionDetailsOptions {
  /** Transaction id/hash to open. When omitted, only the activity list opens. */
  transactionId?: string;
  /**
   * Pre-selects the activity list's type filter (e.g. Predictions), so the list
   * shown behind the details — and returned to on "back" — is already filtered.
   */
  initialTypeFilter?: ActivityTypeFilter;
  initialPerpsFilter?: PerpsActivityFilter;
}

/**
 * Opens a transaction's details from anywhere (e.g. a global toast or a legacy
 * row), landing on the (optionally filtered) activity list first so "back"
 * returns there rather than to the caller.
 *
 * Both `TRANSACTIONS_VIEW` and `TRANSACTION_DETAILS` are reachable from the root
 * navigator, so the two navigations resolve immediately — no mount-order
 * `setTimeout` is needed (unlike the previous per-call-site workaround).
 */
export function navigateToTransactionDetails(
  // Only `navigate` is needed; Pick avoids coupling to the caller's exact
  // NavigationProp variant (hooks override `getState`, class props differ).
  navigation: Pick<NavigationProp<ParamListBase>, 'navigate'>,
  {
    transactionId,
    initialTypeFilter,
    initialPerpsFilter,
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
  if (transactionId) {
    navigation.navigate(Routes.TRANSACTION_DETAILS, { transactionId });
  }
}
