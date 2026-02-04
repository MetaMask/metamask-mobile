import { AuthCapabilities } from '../types';

/**
 * Return type for the useAuthCapabilities hook.
 */
export interface UseAuthCapabilitiesResult {
  /** Whether the capabilities are still loading */
  isLoading: boolean;
  /** Authentication capabilities (null while loading or on error) */
  capabilities: AuthCapabilities | null;
  /** Refresh the capabilities (useful after user changes system settings) */
  refresh: () => Promise<void>;
  /** Update the OS-level authentication enabled state */
  updateOsAuthEnabled: () => void;
}
