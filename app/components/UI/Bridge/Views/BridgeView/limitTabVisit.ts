import { BRIDGE_LIMIT_TAB_VISITED } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';

/** Returns whether this installation has opened the Swap Limit tab. */
export const hasVisitedLimitTab = (): boolean =>
  StorageWrapper.getItemSync(BRIDGE_LIMIT_TAB_VISITED) === 'true';

/** Persists the first Limit tab visit and notifies active subscribers. */
export const markLimitTabVisited = (): void => {
  if (hasVisitedLimitTab()) {
    return;
  }

  StorageWrapper.setItem(BRIDGE_LIMIT_TAB_VISITED, 'true').catch(
    () => undefined,
  );
};

/** Subscribes to Limit tab visit updates for the current app process. */
export const subscribeToLimitTabVisited = (
  listener: (hasVisited: boolean) => void,
): (() => void) =>
  StorageWrapper.onKeyChange(BRIDGE_LIMIT_TAB_VISITED, ({ value }) => {
    listener(value === 'true');
  });
