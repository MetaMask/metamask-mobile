import { useEffect } from 'react';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  consumePostSwapShareReopen,
  subscribePostSwapShareSession,
} from './postSwapShareSession';

/**
 * Reopens Quick Buy when the post-swap failure CTA fires.
 */
export const usePostSwapShareReopen = (
  onReopen: (target: QuickBuyTarget) => void,
): void => {
  useEffect(() => {
    const unsubscribe = subscribePostSwapShareSession(() => {
      const target = consumePostSwapShareReopen();
      if (target) {
        onReopen(target);
      }
    });
    return unsubscribe;
  }, [onReopen]);
};
