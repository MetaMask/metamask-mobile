import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { selectAssetsHaveLoadedForSelectedAccountGroup } from '../../../../selectors/assets/assets-controller';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';

const createSettledAccountGroupsStore = () => {
  const settledAccountGroups = new Set<string>();
  const listeners = new Set<() => void>();

  return {
    add(accountGroupId: string) {
      if (settledAccountGroups.has(accountGroupId)) {
        return;
      }

      settledAccountGroups.add(accountGroupId);
      listeners.forEach((listener) => listener());
    },
    has(accountGroupId: string | null | undefined) {
      return Boolean(
        accountGroupId && settledAccountGroups.has(accountGroupId),
      );
    },
    clear() {
      if (settledAccountGroups.size === 0) {
        return;
      }
      settledAccountGroups.clear();
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * Session-scoped latch shared by every `useAssetsHaveLoaded` caller so full
 * token screens and Money keep real rows during later background refreshes.
 */
const settledAccountGroupsStore = createSettledAccountGroupsStore();

/** Clears the latch between unit tests. */
export const resetAssetsHaveLoadedLatchForTests = (): void => {
  settledAccountGroupsStore.clear();
};

/**
 * Whether assets for the selected account group have finished initial +
 * background load. Latches per account group for the session so later
 * background refreshes do not regress to full skeletons.
 */
export const useAssetsHaveLoaded = (): boolean => {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroupId);
  const currentLoadHasSettled = useSelector(
    selectAssetsHaveLoadedForSelectedAccountGroup,
  );
  const getSnapshot = useCallback(
    () => settledAccountGroupsStore.has(selectedAccountGroup),
    [selectedAccountGroup],
  );
  const selectedGroupHasSettled = useSyncExternalStore(
    settledAccountGroupsStore.subscribe,
    getSnapshot,
    getSnapshot,
  );

  useEffect(() => {
    if (!selectedAccountGroup || !currentLoadHasSettled) {
      return;
    }

    settledAccountGroupsStore.add(selectedAccountGroup);
  }, [currentLoadHasSettled, selectedAccountGroup]);

  return currentLoadHasSettled || selectedGroupHasSettled;
};
