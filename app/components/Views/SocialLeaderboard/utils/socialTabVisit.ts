import { SOCIAL_TAB_VISITED } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';

/** Returns whether this installation has opened the Social V1 home. */
export const hasVisitedSocialTab = (): boolean =>
  StorageWrapper.getItemSync(SOCIAL_TAB_VISITED) === 'true';

/** Persists the first Social V1 home visit and notifies active subscribers. */
export const markSocialTabVisited = (): void => {
  if (hasVisitedSocialTab()) {
    return;
  }

  StorageWrapper.setItem(SOCIAL_TAB_VISITED, 'true').catch(() => undefined);
};

/** Subscribes to Social V1 home visit updates for the current app process. */
export const subscribeToSocialTabVisited = (
  listener: (hasVisited: boolean) => void,
): (() => void) =>
  StorageWrapper.onKeyChange(SOCIAL_TAB_VISITED, ({ value }) => {
    listener(value === 'true');
  });
