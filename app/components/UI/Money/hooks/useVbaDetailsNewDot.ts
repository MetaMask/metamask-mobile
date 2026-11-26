import { useCallback, useState } from 'react';
import { VBA_DETAILS_NEW_DOT_SEEN } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';

const hasSeenVbaDetailsNewDot = (): boolean =>
  StorageWrapper.getItemSync(VBA_DETAILS_NEW_DOT_SEEN) === 'true';

const persistVbaDetailsNewDotSeen = (): void => {
  if (hasSeenVbaDetailsNewDot()) {
    return;
  }

  StorageWrapper.setItem(VBA_DETAILS_NEW_DOT_SEEN, 'true').catch(
    () => undefined,
  );
};

/**
 * Drives the one-shot discovery dot on the Money home Details button.
 *
 * Mirrors the Social tab new badge: MMKV is read synchronously so a dismissed
 * dot cannot flash on the next launch, and the flag stays install-wide.
 */
export const useVbaDetailsNewDot = () => {
  const [showNewDot, setShowNewDot] = useState(
    () => !hasSeenVbaDetailsNewDot(),
  );

  const markSeen = useCallback(() => {
    setShowNewDot(false);
    persistVbaDetailsNewDotSeen();
  }, []);

  return { showNewDot, markSeen };
};
