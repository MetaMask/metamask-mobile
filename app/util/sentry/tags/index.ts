import { RootState } from '../../../reducers';
import { selectAllNftsFlat } from '../../../selectors/nftController';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { selectAllTokensFlat } from '../../../selectors/tokensController';
import { getNotificationsList } from '../../../selectors/notifications';
import { selectTransactions } from '../../../selectors/transactionController';
import { selectPendingApprovals } from '../../../selectors/approvalController';

export function getTraceTags(state: RootState) {
  // if it's cold app start or warm app start
  // Replace this to say how metamask was opened, deeplink, wallet connect, sdk, or just tap
  //const uiType = getEnvironmentType();
  const unlocked = state.user.userLoggedIn;
  const accountCount = selectInternalAccounts(state).length;
  const nftCount = selectAllNftsFlat(state).length;
  const notificationCount = getNotificationsList(state).length;
  const tokenCount = selectAllTokensFlat(state).length;
  const transactionCount = selectTransactions(state).length;
  const pendingApprovals = Object.values(selectPendingApprovals(state));

  const firstApprovalType = pendingApprovals?.[0]?.type;

  return {
    'wallet.account_count': accountCount,
    'wallet.nft_count': nftCount,
    'wallet.notification_count': notificationCount,
    'wallet.pending_approval': firstApprovalType,
    'wallet.token_count': tokenCount,
    'wallet.transaction_count': transactionCount,
    'wallet.unlocked': unlocked,
    'wallet.ui_type': null, //uiType,
  };
}
