import React from 'react';
import { usePerpsWithdrawStatus } from '../hooks/usePerpsWithdrawStatus';
import { usePerpsDepositStatus } from '../hooks/usePerpsDepositStatus';
import { useWebSocketHealthToast } from '../hooks/useWebSocketHealthToast';

/**
 * PerpsStreamBridge - Bridges stream context to global hooks.
 *
 * This component acts as a bridge, allowing hooks to access the PerpsStream context
 * by being rendered inside both PerpsConnectionProvider and PerpsStreamProvider.
 *
 * The WebSocket health toast is rendered at the App level via WebSocketHealthToastProvider
 * and PerpsWebSocketHealthToast to ensure it appears on top of all other content.
 */
const PerpsStreamBridge: React.FC = () => {
  // Enable withdrawal status monitoring and toasts
  usePerpsWithdrawStatus();

  // Enable deposit status monitoring and toasts
  usePerpsDepositStatus();

  // Enable WebSocket health monitoring (toast is rendered at App level)
  useWebSocketHealthToast();

  return null;
};

export default PerpsStreamBridge;
