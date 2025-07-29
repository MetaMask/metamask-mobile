import { WebSocketService } from '@metamask/backend-platform';
import { ControllerInitFunction } from '../../types';
import { WebSocketServiceMessenger } from '../../messengers/backend-platform/websocket-service-messenger';
import { AppStateWebSocketManager } from './AppStateWebSocketManager';

// Import debug helpers to make them available globally
import './debug-helpers';

/**
 * Mobile-specific WebSocketService wrapper that handles the naming conflict
 * between the snaps WebSocketService and backend-platform WebSocketService
 */
export class MobileBackendWebSocketService extends WebSocketService {
  constructor(options: ConstructorParameters<typeof WebSocketService>[0]) {
    // Create a proxy messenger that translates action names
    const originalMessenger = options.messenger;
    const proxyMessenger = {
      ...originalMessenger,
      registerActionHandler: (actionType: string, handler: any) => {
        // Translate WebSocketService actions to BackendWebSocketService actions
        const translatedActionType = actionType.replace('WebSocketService:', 'BackendWebSocketService:');
        return originalMessenger.registerActionHandler(translatedActionType as any, handler);
      },
    };

    super({
      ...options,
      messenger: proxyMessenger as any,
    });
  }

  // Override disconnect to provide better logging for background vs full disconnects
  async disconnect(clearSession?: boolean): Promise<void> {
    if (clearSession === false) {
      console.log('🌙 [MobileWebSocket] Background disconnect - attempting to preserve session');
    } else {
      console.log('🔌 [MobileWebSocket] Full disconnect - clearing session');
    }

    // Call parent disconnect
    return super.disconnect(clearSession);
  }

  // Add destroy method to properly handle cleanup
  destroy() {
    // Disconnect the WebSocket connection and clear session
    this.disconnect(true).catch(console.error);
  }
}

// Global instance of the app state manager
let appStateManager: AppStateWebSocketManager | null = null;

/**
 * Initialize the WebSocket service with app state management.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const WebSocketServiceInit: ControllerInitFunction<
  MobileBackendWebSocketService,
  WebSocketServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MobileBackendWebSocketService({
    messenger: controllerMessenger,
    // Use a more realistic backend WebSocket URL
    url: process.env.BACKEND_WEBSOCKET_URL || 'wss://gateway.dev-api.cx.metamask.io/v1',
    timeout: 10000,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    requestTimeout: 30000,
    sessionIdRetention: 600000, // 10 minutes
  });

  // Initialize app state manager
  if (!appStateManager) {
    appStateManager = new AppStateWebSocketManager();
  }
  appStateManager.setWebSocketService(controller);

  // Add destroy method to controller for proper cleanup
  const originalDestroy = controller.destroy.bind(controller);
  controller.destroy = () => {
    // Cleanup app state manager
    if (appStateManager) {
      appStateManager.cleanup();
      appStateManager = null;
    }
    // Call original destroy
    originalDestroy();
  };

  // Connect with app state awareness instead of direct connection
  // Use setTimeout to avoid blocking the initialization process
  setTimeout(async () => {
    try {
      console.log('[Backend WebSocket] Attempting to connect with session-preserving app state management...');
      await appStateManager?.connect();
      console.log('[Backend WebSocket] Connected successfully with session management');
      
      // Send a test message to demonstrate activity (only if in foreground)
      setTimeout(async () => {
        try {
          await appStateManager?.sendMessage({
            event: 'ping',
            data: {
              requestId: `mobile-init-${Date.now()}`,
              timestamp: Date.now(),
            },
          });
          console.log('[Backend WebSocket] Test ping sent');
        } catch (error) {
          console.log('[Backend WebSocket] Test ping failed (expected if no server or not in foreground):', (error as Error).message);
        }
      }, 2000);
      
    } catch (error) {
      console.log('[Backend WebSocket] Connection failed (expected if no server running):', (error as Error).message);
    }
  }, 1000);

  return {
    memStateKey: null,
    persistedStateKey: null,
    controller,
  };
};

/**
 * Get the global app state manager instance
 * This allows other parts of the app to access the WebSocket manager if needed
 */
export const getAppStateWebSocketManager = (): AppStateWebSocketManager | null => {
  return appStateManager;
};

/**
 * Cleanup function for the WebSocket service and app state manager
 * This should be called when the engine is being destroyed
 */
export const cleanupBackendWebSocketService = (): void => {
  if (appStateManager) {
    appStateManager.cleanup();
    appStateManager = null;
  }
};

// Debug helper for troubleshooting app state WebSocket issues
if (__DEV__) {
  (global as any).getAppStateWebSocketStatus = () => {
    if (!appStateManager) {
      console.log('❌ AppStateWebSocketManager not initialized');
      return { error: 'Manager not initialized' };
    }
    
    const status = appStateManager.getConnectionStatus();
    console.log('📊 AppStateWebSocketManager Status:');
    console.log(`  • App State: ${status.appState}`);
    console.log(`  • Is Connected: ${status.isConnected}`);
    console.log(`  • Should Auto Connect: ${status.shouldAutoConnect}`);
    console.log(`  • Has Active Session: ${status.hasActiveSession}`);
    console.log(`  • Current Session ID: ${status.sessionId || 'none'}`);
    console.log(`  • Preserved Session ID: ${status.preservedSessionId || 'none'}`);
    
    if (status.sessionValidTimeRemaining !== null) {
      const remainingMinutes = Math.round(status.sessionValidTimeRemaining / 60000);
      console.log(`  • Session Valid Time Remaining: ${remainingMinutes} minutes`);
    } else {
      console.log(`  • Session Valid Time Remaining: N/A`);
    }
    
    return status;
  };

  (global as any).getBackendWebSocketSessionInfo = () => {
    try {
      // Try to get session info from the backend WebSocket service
      const service = (global as any).getBackendWebSocket?.();
      if (service && typeof service.getSessionRetentionInfo === 'function') {
        const sessionInfo = service.getSessionRetentionInfo();
        console.log('📊 Backend WebSocket Session Info:');
        console.log(`  • Session ID: ${sessionInfo.sessionId || 'none'}`);
        console.log(`  • Last Disconnect Time: ${sessionInfo.lastDisconnectTime ? new Date(sessionInfo.lastDisconnectTime) : 'none'}`);
        console.log(`  • Time Since Disconnect: ${sessionInfo.timeSinceDisconnectMs ? Math.round(sessionInfo.timeSinceDisconnectMs / 60000) + ' minutes' : 'N/A'}`);
        console.log(`  • Session Expired: ${sessionInfo.sessionExpired}`);
        return sessionInfo;
      } else {
        console.log('❌ Backend WebSocket service or getSessionRetentionInfo method not available');
        return { error: 'Service not available' };
      }
    } catch (error) {
      console.log('❌ Error getting backend WebSocket session info:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  };

  (global as any).forceWebSocketReconnect = async () => {
    if (!appStateManager) {
      console.log('❌ AppStateWebSocketManager not initialized');
      return;
    }
    
    console.log('🔄 Forcing WebSocket reconnection...');
    try {
      await appStateManager.connect();
      console.log('✅ Reconnection successful');
      
      // Show status after reconnection
      setTimeout(() => {
        (global as any).getAppStateWebSocketStatus();
      }, 1000);
    } catch (error) {
      console.log('❌ Reconnection failed:', error);
    }
  };

  (global as any).testSessionResumption = async () => {
    if (!appStateManager) {
      console.log('❌ AppStateWebSocketManager not initialized');
      return;
    }

    console.log('🧪 Testing session resumption flow with FIXED WebSocket service...');
    
    // Get initial status
    const initialStatus = appStateManager.getConnectionStatus();
    console.log(`📊 Initial state: connected=${initialStatus.isConnected}, session=${initialStatus.sessionId}`);
    
    if (!initialStatus.isConnected) {
      console.log('⚠️ Not connected, connecting first...');
      await appStateManager.connect();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const connectedStatus = appStateManager.getConnectionStatus();
    const originalSessionId = connectedStatus.sessionId;
    console.log(`📊 Connected state: session=${originalSessionId}`);
    
    // Simulate background (preserve session)
    console.log('🌙 Simulating background disconnect (preserve session)...');
    await appStateManager.disconnect();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check preserved session
    const backgroundStatus = appStateManager.getConnectionStatus();
    console.log(`📊 Background state: preserved=${backgroundStatus.preservedSessionId}`);
    
    // Simulate foreground
    console.log('☀️ Simulating foreground reconnect...');
    await appStateManager.connect();
    
    // Wait for session to be established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Final status
    const finalStatus = appStateManager.getConnectionStatus();
    console.log(`📊 Final state: connected=${finalStatus.isConnected}, session=${finalStatus.sessionId}`);
    
    // Check if session was resumed
    if (originalSessionId && finalStatus.sessionId === originalSessionId) {
      console.log('✅ SUCCESS: Session resumption worked! Same session ID preserved.');
    } else if (backgroundStatus.preservedSessionId && finalStatus.sessionId === backgroundStatus.preservedSessionId) {
      console.log('✅ SUCCESS: Session preservation worked! Preserved session was used.');
    } else {
      console.log('⚠️ Session resumption failed - new session created');
      console.log(`   Original: ${originalSessionId}`);
      console.log(`   Preserved: ${backgroundStatus.preservedSessionId}`);
      console.log(`   Final: ${finalStatus.sessionId}`);
    }
  };

  (global as any).testDirectWebSocketDisconnect = async () => {
    try {
      const service = (global as any).getBackendWebSocket?.();
      if (!service) {
        console.log('❌ Backend WebSocket service not available');
        return;
      }

      console.log('🧪 Testing direct WebSocket service session preservation...');
      
      // Check initial state
      const initialSessionId = service.getSessionId();
      console.log(`📊 Initial session: ${initialSessionId}`);
      
      if (!initialSessionId) {
        console.log('⚠️ No session, connecting first...');
        await service.connect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const connectedSessionId = service.getSessionId();
      console.log(`📊 Connected session: ${connectedSessionId}`);

      // Test preserve session disconnect
      console.log('🌙 Testing disconnect(false) - should preserve session...');
      await service.disconnect(false);
      
      // Wait for close event to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterDisconnectSessionId = service.getSessionId();
      console.log(`📊 After disconnect(false): ${afterDisconnectSessionId}`);
      
      if (afterDisconnectSessionId === connectedSessionId) {
        console.log('✅ SUCCESS: Session preserved after disconnect(false)!');
      } else {
        console.log('❌ FAILED: Session was cleared despite disconnect(false)');
      }
      
    } catch (error) {
      console.log('❌ Test failed:', error);
    }
  };

  console.log('🚀 [Debug] AppStateWebSocketManager debug helpers loaded!');
  console.log('Available functions:');
  console.log('  - global.getAppStateWebSocketStatus()');
  console.log('  - global.getBackendWebSocketSessionInfo()');
  console.log('  - global.forceWebSocketReconnect()');
  console.log('  - global.testSessionResumption()');
  console.log('  - global.testDirectWebSocketDisconnect()');
} 