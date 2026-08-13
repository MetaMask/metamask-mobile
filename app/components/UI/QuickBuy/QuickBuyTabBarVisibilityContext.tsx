import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface QuickBuyTabBarVisibilityContextValue {
  registerQuickBuyOpen: () => void;
  unregisterQuickBuyOpen: () => void;
  isQuickBuyOpen: boolean;
}

const noop = () => undefined;

const defaultContextValue: QuickBuyTabBarVisibilityContextValue = {
  registerQuickBuyOpen: noop,
  unregisterQuickBuyOpen: noop,
  isQuickBuyOpen: false,
};

const QuickBuyTabBarVisibilityContext =
  createContext<QuickBuyTabBarVisibilityContextValue>(defaultContextValue);

/**
 * Tracks open Quick Buy sheets so HomeTabs can hide the bottom tab bar while
 * the sheet is visible.
 */
export const QuickBuyTabBarVisibilityProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [openCount, setOpenCount] = useState(0);

  const registerQuickBuyOpen = useCallback(() => {
    setOpenCount((count) => count + 1);
  }, []);

  const unregisterQuickBuyOpen = useCallback(() => {
    setOpenCount((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    (): QuickBuyTabBarVisibilityContextValue => ({
      registerQuickBuyOpen,
      unregisterQuickBuyOpen,
      isQuickBuyOpen: openCount > 0,
    }),
    [registerQuickBuyOpen, unregisterQuickBuyOpen, openCount],
  );

  return (
    <QuickBuyTabBarVisibilityContext.Provider value={value}>
      {children}
    </QuickBuyTabBarVisibilityContext.Provider>
  );
};

export function useQuickBuyTabBarVisibility(): QuickBuyTabBarVisibilityContextValue {
  return useContext(QuickBuyTabBarVisibilityContext);
}

export function useIsQuickBuyOpen(): boolean {
  return useQuickBuyTabBarVisibility().isQuickBuyOpen;
}
