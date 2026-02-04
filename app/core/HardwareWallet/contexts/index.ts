/**
 * Split contexts for hardware wallet management.
 *
 * The contexts are split for performance optimization:
 * - ConfigContext: Rarely changes (wallet type, permissions)
 * - StateContext: Frequently changes (connection state)
 * - ActionsContext: Stable callbacks (connect, disconnect, etc.)
 *
 * This pattern prevents unnecessary re-renders when only state changes
 * but actions/config remain the same.
 */

export {
  HardwareWalletConfigProvider,
  useHardwareWalletConfig,
  type HardwareWalletConfigContextType,
  type HardwareWalletConfigProviderProps,
} from './HardwareWalletConfigContext';

export {
  HardwareWalletStateProvider,
  useHardwareWalletState,
  useConnectionStatus,
  useIsDeviceConnected,
  useIsOperationInProgress,
  type HardwareWalletStateContextType,
  type HardwareWalletStateProviderProps,
  type DeviceSelectionState,
} from './HardwareWalletStateContext';

export {
  HardwareWalletActionsProvider,
  useHardwareWalletActions,
  type HardwareWalletActionsContextType,
  type HardwareWalletActionsProviderProps,
} from './HardwareWalletActionsContext';
