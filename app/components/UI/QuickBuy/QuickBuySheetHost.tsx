import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import {
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import QuickBuyRoot from './QuickBuyRoot';
import type { QuickBuyRootProps, QuickBuyTarget } from './types';

export type QuickBuySheetOptions = Omit<
  QuickBuyRootProps,
  'isVisible' | 'target' | 'onClose' | 'children'
> & { target: QuickBuyTarget };

interface QuickBuySheetControls {
  openQuickBuy: (options: QuickBuySheetOptions) => void;
  closeQuickBuy: () => void;
}

interface UseQuickBuySheetResult extends QuickBuySheetControls {
  quickBuySheet: React.ReactNode;
}

interface QuickBuySheetHostControls {
  openQuickBuy: (ownerId: string, options: QuickBuySheetOptions) => void;
  closeQuickBuy: (ownerId: string) => void;
}

interface HostedQuickBuySheet {
  ownerId: string;
  options: QuickBuySheetOptions;
}

const QuickBuySheetHostContext = createContext<
  QuickBuySheetHostControls | undefined
>(undefined);

const QuickBuySheet: React.FC<{
  options: QuickBuySheetOptions | null;
  onClose: () => void;
}> = ({ options, onClose }) =>
  options ? <QuickBuyRoot {...options} isVisible onClose={onClose} /> : null;

/**
 * Hosts Quick Buy above the home tab navigator. The design-system BottomSheet
 * is an inline `absolute inset-0` view, so a sheet mounted inside a tab draws
 * under the native and floating tab bars.
 */
export const QuickBuySheetHostProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [sheet, setSheet] = useState<HostedQuickBuySheet | null>(null);
  const dismissSheet = useCallback(() => setSheet(null), []);
  const value = useMemo(
    (): QuickBuySheetHostControls => ({
      openQuickBuy: (ownerId, options) => setSheet({ ownerId, options }),
      closeQuickBuy: (ownerId) =>
        setSheet((current) => (current?.ownerId === ownerId ? null : current)),
    }),
    [],
  );

  return (
    <QuickBuySheetHostContext.Provider value={value}>
      {children}
      <QuickBuySheet options={sheet?.options ?? null} onClose={dismissSheet} />
    </QuickBuySheetHostContext.Provider>
  );
};

/**
 * Opens Quick Buy through the home tabs host when one is mounted, so the sheet
 * covers the tab bar. Stack routes have no host and render `quickBuySheet` inline.
 * A hosted sheet closes when its opener unmounts or another tab is selected.
 */
export const useQuickBuySheet = (): UseQuickBuySheetResult => {
  const host = useContext(QuickBuySheetHostContext);
  const navigation = useContext(NavigationContext);
  const routeKey = useContext(NavigationRouteContext)?.key;
  const ownerId = useId();
  const [options, setOptions] = useState<QuickBuySheetOptions | null>(null);
  const closeInlineSheet = useCallback(() => setOptions(null), []);
  const openHostedSheet = useCallback(
    (nextOptions: QuickBuySheetOptions) =>
      host?.openQuickBuy(ownerId, nextOptions),
    [host, ownerId],
  );
  const closeHostedSheet = useCallback(
    () => host?.closeQuickBuy(ownerId),
    [host, ownerId],
  );

  // The host outlives this consumer, so its sheet must not.
  useEffect(() => closeHostedSheet, [closeHostedSheet]);

  // Same check as UnmountOnTabBlur: modals pushed above the tabs keep the selected route.
  useEffect(() => {
    if (!host || !navigation || !routeKey) {
      return undefined;
    }
    return navigation.addListener('state', ({ data: { state } }) => {
      if (state.routes[state.index]?.key !== routeKey) {
        closeHostedSheet();
      }
    });
  }, [host, navigation, routeKey, closeHostedSheet]);

  if (host) {
    return {
      openQuickBuy: openHostedSheet,
      closeQuickBuy: closeHostedSheet,
      quickBuySheet: null,
    };
  }

  return {
    openQuickBuy: setOptions,
    closeQuickBuy: closeInlineSheet,
    quickBuySheet: (
      <QuickBuySheet options={options} onClose={closeInlineSheet} />
    ),
  };
};
