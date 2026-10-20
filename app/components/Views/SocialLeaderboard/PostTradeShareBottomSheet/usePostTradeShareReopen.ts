import { useEffect } from 'react';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import {
  consumePostTradeShareReopen,
  subscribePostTradeShareSession,
} from './postTradeShareSession';

/**
 * Reopens Quick Buy when the post-trade failure CTA fires.
 *
 * Only the focused screen should subscribe. The session delivers the retry to
 * the first listener, and Social V1 stays mounted under a position screen.
 */
export const usePostTradeShareReopen = (
  onReopen: (target: QuickBuyTarget, copyTradeOrigin?: CopyTradeOrigin) => void,
  isActive = true,
): void => {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    const unsubscribe = subscribePostTradeShareSession(() => {
      const reopened = consumePostTradeShareReopen();
      if (reopened) {
        onReopen(reopened.target, reopened.copyTradeOrigin);
      }
    });
    return unsubscribe;
  }, [isActive, onReopen]);
};
