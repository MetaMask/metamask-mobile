import { useEffect } from 'react';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import type { QuickBuyTradeMode } from '../../../UI/QuickBuy/types';
import {
  consumePostTradeShareReopen,
  getPostTradeShareSession,
  subscribePostTradeShareSession,
  type PostTradeShareOwnerId,
} from './postTradeShareSession';

/**
 * Reopens Quick Buy when the post-trade failure CTA fires for `owner`.
 *
 * Other mounted Social screens ignore the retry. The session is consumed only
 * by the screen that started the swap.
 */
export const usePostTradeShareReopen = (
  onReopen: (
    target: QuickBuyTarget,
    copyTradeOrigin?: CopyTradeOrigin,
    tradeMode?: QuickBuyTradeMode,
  ) => void,
  owner?: PostTradeShareOwnerId,
): void => {
  useEffect(() => {
    if (!owner) {
      return undefined;
    }
    const unsubscribe = subscribePostTradeShareSession(() => {
      const session = getPostTradeShareSession();
      if (
        !session?.reopenRequested ||
        session.product !== 'spot' ||
        session.owner !== owner
      ) {
        return;
      }
      const reopened = consumePostTradeShareReopen();
      if (reopened) {
        onReopen(reopened.target, reopened.copyTradeOrigin, reopened.tradeMode);
      }
    });
    return unsubscribe;
  }, [onReopen, owner]);
};
