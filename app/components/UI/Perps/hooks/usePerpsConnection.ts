import { useContext } from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  PerpsConnectionContext,
  type PerpsConnectionContextValue,
} from '../providers/PerpsConnectionProvider';

/**
 * Hook to access the Perps connection context
 *
 * This is the primary API for UI components to interact with the connection system.
 * Components use this hook to access connection state and methods.
 *
 * @returns Connection state and methods (connect, disconnect, reconnectWithNewContext, etc.)
 * @throws Error if used outside of PerpsConnectionProvider
 */
export const usePerpsConnection = (): PerpsConnectionContextValue => {
  const context = useContext(PerpsConnectionContext);
  if (!context) {
    throw new Error(strings('perps.errors.connectionRequired'));
  }
  return context;
};
