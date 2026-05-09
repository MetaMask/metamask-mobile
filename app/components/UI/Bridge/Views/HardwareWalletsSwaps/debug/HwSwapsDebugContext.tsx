import React, { createContext, useContext, useState } from 'react';
import type { HardwareWalletsSwapsState } from '../HardwareWalletsSwaps.state';

// eslint-disable-next-line no-empty-function
const noop = () => {};

interface HwSwapsDebugContextValue {
  isDebugOverlayEnabled: boolean;
  setDebugOverlayEnabled: (enabled: boolean) => void;
  debugState: HardwareWalletsSwapsState | null;
  setDebugState: (state: HardwareWalletsSwapsState | null) => void;
}

const HwSwapsDebugContext = createContext<HwSwapsDebugContextValue>({
  isDebugOverlayEnabled: false,
  setDebugOverlayEnabled: noop,
  debugState: null,
  setDebugState: noop,
});

export function HwSwapsDebugProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDebugOverlayEnabled, setDebugOverlayEnabled] = useState(false);
  const [debugState, setDebugState] =
    useState<HardwareWalletsSwapsState | null>(null);

  return (
    <HwSwapsDebugContext.Provider
      value={{
        isDebugOverlayEnabled,
        setDebugOverlayEnabled,
        debugState,
        setDebugState,
      }}
    >
      {children}
    </HwSwapsDebugContext.Provider>
  );
}

export function useHwSwapsDebug() {
  return useContext(HwSwapsDebugContext);
}
