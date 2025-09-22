import { useEffect, useState, useCallback } from 'react';
import type {
  Transaction,
  AccountActivityService,
  WebSocketService,
  BalanceUpdate,
  WebSocketConnectionInfo,
} from '@metamask/backend-platform';
import { Engine } from '../core/Engine/Engine';

export interface AccountActivityState {
  connectionInfo: WebSocketConnectionInfo | null;
  isConnected: boolean;
  lastTransaction: Transaction | null;
  lastBalanceUpdate: {
    address: string;
    chain: string;
    updates: BalanceUpdate[];
  } | null;
  subscriptionError: string | null;
}

/**
 * React hook for subscribing to account activity updates from the WebSocket service.
 * Bypasses Redux by directly subscribing to controller events for optimal performance.
 *
 * @returns AccountActivityState and control functions
 */
export const useAccountActivity = () => {
  const [state, setState] = useState<AccountActivityState>({
    connectionInfo: null,
    isConnected: false,
    lastTransaction: null,
    lastBalanceUpdate: null,
    subscriptionError: null,
  });

  // Get services from Engine context
  const getServices = useCallback(() => {
    const engine = Engine.instance;
    if (!engine) return null;

    const backendWebSocketService = engine.context
      .BackendWebSocketService as WebSocketService;
    const accountActivityService = engine.context
      .AccountActivityService as AccountActivityService;

    return { backendWebSocketService, accountActivityService };
  }, []);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback(
    (connectionInfo: WebSocketConnectionInfo) => {
      setState((prev) => ({
        ...prev,
        connectionInfo,
        isConnected: connectionInfo.state === 'connected',
      }));
    },
    [],
  );

  // Handle transaction updates
  const handleTransactionUpdate = useCallback((transaction: Transaction) => {
    setState((prev) => ({
      ...prev,
      lastTransaction: transaction,
    }));
  }, []);

  // Handle balance updates
  const handleBalanceUpdate = useCallback(
    (balanceData: {
      address: string;
      chain: string;
      updates: BalanceUpdate[];
    }) => {
      setState((prev) => ({
        ...prev,
        lastBalanceUpdate: balanceData,
      }));
    },
    [],
  );

  // Handle subscription errors
  const handleSubscriptionError = useCallback(
    (errorData: { addresses: string[]; error: string; operation: string }) => {
      setState((prev) => ({
        ...prev,
        subscriptionError: `${
          errorData.operation
        } failed for ${errorData.addresses.join(', ')}: ${errorData.error}`,
      }));
    },
    [],
  );

  // Setup subscriptions
  useEffect(() => {
    const services = getServices();
    if (!services) return;

    const { backendWebSocketService } = services;
    const engine = Engine.instance;
    if (!engine) return;

    const messenger = engine.controllerMessenger;

    // Subscribe to AccountActivityService events
    messenger.subscribe(
      'AccountActivityService:transactionUpdated',
      handleTransactionUpdate,
    );

    messenger.subscribe(
      'AccountActivityService:balanceUpdated',
      handleBalanceUpdate,
    );

    messenger.subscribe(
      'AccountActivityService:subscriptionError',
      handleSubscriptionError,
    );

    // Get initial connection state
    const initialConnectionInfo = backendWebSocketService.getConnectionInfo();
    setState((prev) => ({
      ...prev,
      connectionInfo: initialConnectionInfo,
      isConnected: initialConnectionInfo.state === 'connected',
    }));

    // Cleanup subscriptions
    return () => {
      try {
        messenger.unsubscribe(
          'AccountActivityService:transactionUpdated',
          handleTransactionUpdate,
        );
        messenger.unsubscribe(
          'AccountActivityService:balanceUpdated',
          handleBalanceUpdate,
        );
        messenger.unsubscribe(
          'AccountActivityService:subscriptionError',
          handleSubscriptionError,
        );
      } catch (error) {
        console.error(
          'Error cleaning up useAccountActivity subscriptions:',
          error,
        );
      }
    };
  }, [
    handleConnectionStateChange,
    handleTransactionUpdate,
    handleBalanceUpdate,
    handleSubscriptionError,
    getServices,
  ]);

  return state;
};
