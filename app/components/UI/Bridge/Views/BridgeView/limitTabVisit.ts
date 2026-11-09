import { BRIDGE_LIMIT_TAB_VISITED } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';

/** Returns whether this installation has opened the Swap Limit tab. */
export const hasVisitedLimitTab = (): boolean =>
  StorageWrapper.getItemSync(BRIDGE_LIMIT_TAB_VISITED) === 'true';

/**
 * Persists the first Limit tab visit and notifies active subscribers. A failed
 * write only means the dot shows again on the next visit, so it never rejects.
 */
export const markLimitTabVisited = async (): Promise<void> => {
  if (hasVisitedLimitTab()) {
    return;
  }

  try {
    await StorageWrapper.setItem(BRIDGE_LIMIT_TAB_VISITED, 'true');
  } catch {
    // The visit is retried the next time the Limit tab opens.
  }
};

/** Subscribes to Limit tab visit updates for the current app process. */
export const subscribeToLimitTabVisited = (
  listener: (hasVisited: boolean) => void,
): (() => void) =>
  StorageWrapper.onKeyChange(BRIDGE_LIMIT_TAB_VISITED, ({ value }) => {
    listener(value === 'true');
  });
