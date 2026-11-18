import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { useSelector } from 'react-redux';
import { selectAssetsHaveLoadedForSelectedAccountGroup } from '../../../../selectors/assets/assets-controller';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';

const AssetsHaveLoadedContext = createContext<boolean | undefined>(undefined);

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
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * Latches "assets have loaded" per account group for the wallet home tree so
 * later background refreshes do not regress to full skeletons.
 */
export const AssetsHaveLoadedProvider = ({
  children,
}: React.PropsWithChildren) => {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroupId);
  const currentLoadHasSettled = useSelector(
    selectAssetsHaveLoadedForSelectedAccountGroup,
  );
  const [settledAccountGroups] = useState(createSettledAccountGroupsStore);
  const getSnapshot = useCallback(
    () => settledAccountGroups.has(selectedAccountGroup),
    [selectedAccountGroup, settledAccountGroups],
  );
  const selectedGroupHasSettled = useSyncExternalStore(
    settledAccountGroups.subscribe,
    getSnapshot,
    getSnapshot,
  );

  useEffect(() => {
    if (!selectedAccountGroup || !currentLoadHasSettled) {
      return;
    }

    settledAccountGroups.add(selectedAccountGroup);
  }, [currentLoadHasSettled, selectedAccountGroup, settledAccountGroups]);

  const assetsHaveLoaded = currentLoadHasSettled || selectedGroupHasSettled;

  return (
    <AssetsHaveLoadedContext.Provider value={assetsHaveLoaded}>
      {children}
    </AssetsHaveLoadedContext.Provider>
  );
};

/**
 * Whether assets for the selected account group have finished initial +
 * background load. Uses the homepage latch when under
 * {@link AssetsHaveLoadedProvider}; otherwise reads the selector directly.
 */
export const useAssetsHaveLoaded = (): boolean => {
  const contextValue = useContext(AssetsHaveLoadedContext);
  const selectorValue = useSelector(
    selectAssetsHaveLoadedForSelectedAccountGroup,
  );

  return contextValue ?? selectorValue;
};
