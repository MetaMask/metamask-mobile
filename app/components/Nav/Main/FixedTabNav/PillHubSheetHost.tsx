import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface HostedSheet {
  ownerId: string;
  node: ReactNode;
}

interface PillHubSheetHostControls {
  /** Replaces the hosted sheet. `ownerId` identifies the mounting screen. */
  showSheet: (ownerId: string, node: ReactNode) => void;
  /** Clears the hosted sheet when it belongs to `ownerId`. */
  hideSheet: (ownerId: string) => void;
}

const PillHubSheetHostContext = createContext<
  PillHubSheetHostControls | undefined
>(undefined);

/**
 * Hosts hub sheets above the fixed footer tab bar. The design-system
 * `BottomSheet` is an inline `absolute inset-0` view, so a sheet mounted
 * inside a hub screen draws under the footer (the footer is absolutely
 * positioned and painted after the tab scenes). Mounted here — as a sibling
 * after the `Tab.Navigator` — the sheet and its backdrop cover the footer,
 * like every other bottom sheet in the app.
 */
export const PillHubSheetHostProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [sheet, setSheet] = useState<HostedSheet | null>(null);

  const value = useMemo(
    (): PillHubSheetHostControls => ({
      showSheet: (ownerId, node) => setSheet({ ownerId, node }),
      hideSheet: (ownerId) =>
        setSheet((current) => (current?.ownerId === ownerId ? null : current)),
    }),
    [],
  );

  return (
    <PillHubSheetHostContext.Provider value={value}>
      {children}
      {sheet?.node ?? null}
    </PillHubSheetHostContext.Provider>
  );
};

interface HostedSheetControls {
  /** Renders `node` above the fixed footer while set; pass null to remove. */
  setHostedSheet: (node: ReactNode) => void;
}

/**
 * Publishes a sheet node to the hub host above the fixed footer. Returns null
 * when no host is mounted (e.g. the screen opened on its own stack route), so
 * the caller renders its sheet inline instead.
 */
export const usePillHubSheetHost = (): HostedSheetControls | null => {
  const host = useContext(PillHubSheetHostContext);
  const ownerId = useId();

  const setHostedSheet = useCallback(
    (node: ReactNode) => {
      if (node != null) {
        host?.showSheet(ownerId, node);
      } else {
        host?.hideSheet(ownerId);
      }
    },
    [host, ownerId],
  );

  // The host outlives this consumer, so its sheet must not.
  useEffect(() => () => host?.hideSheet(ownerId), [host, ownerId]);

  return useMemo(
    () => (host ? { setHostedSheet } : null),
    [host, setHostedSheet],
  );
};
