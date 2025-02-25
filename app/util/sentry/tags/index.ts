import { RootState } from '../../../reducers';
import { selectAllNftsFlat } from '../../../selectors/nftController';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { selectAllTokensFlat } from '../../../selectors/tokensController';
import { getNotificationsList } from '../../../selectors/notifications';
import { selectTransactions } from '../../../selectors/transactionController';
import { selectPendingApprovals } from '../../../selectors/approvalController';

export function getTraceTags(state: RootState) {
  const tags: Record<string, number | string | boolean> = {};

  try {
    tags['wallet.unlocked'] = state.user.userLoggedIn;
  } catch (_) {
    /* empty */
  }

  // Early return if core engine state is not available
  if (
    !state?.engine?.backgroundState ||
    !Object.keys(state.engine.backgroundState).length
  ) {
    return tags;
  }

  try {
    if (state?.engine?.backgroundState?.AccountsController) {
      tags['wallet.account_count'] = selectInternalAccounts(state)?.length;
    }
  } catch (_) {
    /* empty */
  }

  try {
    if (state?.engine?.backgroundState?.NftController?.allNfts) {
      tags['wallet.nft_count'] = selectAllNftsFlat(state)?.length;
    }
  } catch (_) {
    /* empty */
  }

  try {
    if (
      state?.engine?.backgroundState?.NotificationServicesController
        ?.metamaskNotificationsList
    ) {
      tags['wallet.notification_count'] = getNotificationsList(state)?.length;
    }
  } catch (_) {
    /* empty */
  }

  try {
    if (state?.engine?.backgroundState?.TokensController?.allTokens) {
      tags['wallet.token_count'] = selectAllTokensFlat(state)?.length;
    }
  } catch (_) {
    /* empty */
  }

  try {
    if (state?.engine?.backgroundState?.TransactionController?.transactions) {
      tags['wallet.transaction_count'] = selectTransactions(state)?.length;
    }
  } catch (_) {
    /* empty */
  }

  try {
    if (state?.engine?.backgroundState?.ApprovalController) {
      const pendingApprovals = selectPendingApprovals(state);
      const pendingApprovalsValues = Object.values(pendingApprovals ?? {});
      tags['wallet.pending_approval'] = pendingApprovalsValues?.[0]?.type;
    }
  } catch (_) {
    /* empty */
  }

  return tags;
}
