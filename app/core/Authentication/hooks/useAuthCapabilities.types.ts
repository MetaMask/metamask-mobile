import { AuthCapabilities } from '../types';

/**
 * Return type for the useAuthCapabilities hook.
 */
export interface UseAuthCapabilitiesResult {
  /** Whether the capabilities are still loading */
  isLoading: boolean;
  /** Authentication capabilities (null while loading or on error) */
  capabilities: AuthCapabilities | null;
}
