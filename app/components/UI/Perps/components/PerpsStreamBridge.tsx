import React from 'react';
import { usePerpsWithdrawStatus } from '../hooks/usePerpsWithdrawStatus';
import { usePerpsDepositStatus } from '../hooks/usePerpsDepositStatus';
import { useWebSocketHealthToast } from '../hooks/useWebSocketHealthToast';
import PerpsWebSocketHealthToast from './PerpsWebSocketHealthToast';

/**
 * PerpsStreamBridge - Bridges stream context to global hooks.
 *
 * This component acts as a bridge, allowing hooks to access the PerpsStream context
 * by being rendered inside both PerpsConnectionProvider and PerpsStreamProvider.
 *
 * It also renders the WebSocket health toast for connection status notifications.
 */
const PerpsStreamBridge: React.FC = () => {
  // Enable withdrawal status monitoring and toasts
  usePerpsWithdrawStatus();

  // Enable deposit status monitoring and toasts
  usePerpsDepositStatus();

  // Enable WebSocket health monitoring and get toast state
  const { isVisible, connectionState, reconnectionAttempt, onHide } =
    useWebSocketHealthToast();

  // Render the WebSocket health toast
  return (
    <PerpsWebSocketHealthToast
      isVisible={isVisible}
      connectionState={connectionState}
      reconnectionAttempt={reconnectionAttempt}
      onHide={onHide}
    />
  );
};

export default PerpsStreamBridge;
