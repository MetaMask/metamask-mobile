import { RootState } from '../../../reducers';
import { selectAllNftsFlat } from '../../../selectors/nftController';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { selectAllTokensFlat } from '../../../selectors/tokensController';
import { getNotificationsList } from '../../../selectors/notifications';
import { selectTransactions } from '../../../selectors/transactionController';

export function getTraceTags(state: RootState) {
  // Replace this to say how metamask was opened, deeplink, wallet connect, sdk, or just tap
  //const uiType = getEnvironmentType();
  const unlocked = state.user.userLoggedIn;
  const accountCount = selectInternalAccounts(state).length;
  const nftCount = selectAllNftsFlat(state).length;
  const notificationCount = getNotificationsList(state).length;
  const tokenCount = selectAllTokensFlat(state).length as number;
  const transactionCount = selectTransactions(state).length;

  /* Understand the pending approvals and implement those how mobile does it 
  const pendingApprovals = getPendingApprovals(
    state as unknown as ApprovalsMetaMaskState,
  ); */

  //const firstApprovalType = pendingApprovals?.[0]?.type;

  return {
    'wallet.account_count': accountCount,
    'wallet.nft_count': nftCount,
    'wallet.notification_count': notificationCount,
    'wallet.pending_approval': null, //firstApprovalType,
    'wallet.token_count': tokenCount,
    'wallet.transaction_count': transactionCount,
    'wallet.unlocked': unlocked,
    'wallet.ui_type': null, //uiType,
  };
}
