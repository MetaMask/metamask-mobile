import { AccountActivityService } from '@metamask/backend-platform';
import { ControllerInitFunction } from '../../types';
import { AccountActivityServiceMessenger } from '../../messengers/backend-platform/account-activity-service-messenger';
import { MobileBackendWebSocketService } from './websocket-service-init';

// Import debug helpers to make them available globally
import './account-activity-debug-helpers';

/**
 * Initialize the Account Activity service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.getController - Function to get other controllers.
 * @returns The initialized service.
 */
export const AccountActivityServiceInit = ({ controllerMessenger, getController }: any) => {
  // Get the BackendWebSocketService instance
  const webSocketService = getController('BackendWebSocketService') as MobileBackendWebSocketService;

  const controller = new AccountActivityService({
    messenger: controllerMessenger,
    webSocketService,
    // Mobile-optimized configuration
    maxActiveSubscriptions: 50, // Higher limit for mobile users with multiple accounts
    processAllTransactions: true, // Process all transaction types
  });

  // Log successful initialization
  console.log('[Account Activity Service] Initialized with backend WebSocket service');

  return {
    memStateKey: null,
    persistedStateKey: null,
    controller,
  };
}; 