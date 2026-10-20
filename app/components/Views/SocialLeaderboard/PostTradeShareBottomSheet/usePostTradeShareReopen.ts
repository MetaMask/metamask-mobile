import { useEffect } from 'react';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import {
  consumePostTradeShareReopen,
  subscribePostTradeShareSession,
} from './postTradeShareSession';

/**
 * Reopens Quick Buy when the post-trade failure CTA fires.
 */
export const usePostTradeShareReopen = (
  onReopen: (target: QuickBuyTarget, copyTradeOrigin?: CopyTradeOrigin) => void,
): void => {
  useEffect(() => {
    const unsubscribe = subscribePostTradeShareSession(() => {
      const reopened = consumePostTradeShareReopen();
      if (reopened) {
        onReopen(reopened.target, reopened.copyTradeOrigin);
      }
    });
    return unsubscribe;
  }, [onReopen]);
};
