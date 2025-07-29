/**
 * Debug helpers for testing MobileBackendWebSocketService
 * 
 * These functions can be called from the React Native debugger console
 * to manually test WebSocket functionality and see network activity.
 */

import Engine from '../../Engine';

/**
 * Get the backend WebSocket service instance
 */
export function getBackendWebSocket() {
  return Engine.context.BackendWebSocketService;
}

/**
 * Manually connect to the backend WebSocket
 * Usage in debugger: window.testBackendConnect()
 */
export async function testBackendConnect() {
  const service = getBackendWebSocket();
  try {
    console.log('🔌 [Debug] Connecting to backend WebSocket...');
    await service.connect();
    console.log('✅ [Debug] Backend WebSocket connected!');
    
    const connectionInfo = service.getConnectionInfo();
    console.log('📊 [Debug] Connection info:', {
      state: connectionInfo.state,
      url: connectionInfo.url,
      connectedAt: connectionInfo.connectedAt ? new Date(connectionInfo.connectedAt) : null,
      sessionId: connectionInfo.sessionId,
    });
    
    return true;
  } catch (error) {
    console.error('❌ [Debug] Connection failed:', (error as Error).message);
    return false;
  }
}

/**
 * Send a test message to create network activity
 * Usage in debugger: window.testBackendMessage()
 */
export async function testBackendMessage() {
  const service = getBackendWebSocket();
  try {
    console.log('📤 [Debug] Sending test message...');
    await service.sendMessage({
      event: 'debug-test',
      data: {
        requestId: `debug-${Date.now()}`,
        message: 'Hello from MetaMask Mobile!',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('✅ [Debug] Test message sent!');
    return true;
  } catch (error) {
    console.error('❌ [Debug] Failed to send message:', (error as Error).message);
    return false;
  }
}

/**
 * Get current connection status and session info
 * Usage in debugger: window.getBackendStatus()
 */
export function getBackendStatus() {
  const service = getBackendWebSocket();
  const connectionInfo = service.getConnectionInfo();
  const sessionInfo = service.getSessionRetentionInfo();
  
  const status = {
    connection: {
      state: connectionInfo.state,
      url: connectionInfo.url,
      reconnectAttempts: connectionInfo.reconnectAttempts,
      lastError: connectionInfo.lastError,
      connectedAt: connectionInfo.connectedAt ? new Date(connectionInfo.connectedAt) : null,
    },
    session: {
      sessionId: sessionInfo.sessionId,
      lastDisconnectTime: sessionInfo.lastDisconnectTime ? new Date(sessionInfo.lastDisconnectTime) : null,
      timeSinceDisconnectMs: sessionInfo.timeSinceDisconnectMs,
      sessionExpired: sessionInfo.sessionExpired,
    },
  };
  
  console.log('📊 [Debug] Backend WebSocket Status:', status);
  return status;
}

/**
 * Test subscription functionality
 * Usage in debugger: window.testBackendSubscription()
 */
export async function testBackendSubscription() {
  const service = getBackendWebSocket();
  try {
    console.log('🔔 [Debug] Setting up test subscription...');
    
    const subscription = await service.subscribe({
      namespace: 'debug.v1',
      channels: ['test-channel', 'mobile-debug'],
      callback: (notification) => {
        console.log('📨 [Debug] Received notification:', notification);
      },
    });
    
    console.log('✅ [Debug] Subscription created!');
    
    // Auto-unsubscribe after 30 seconds for testing
    setTimeout(async () => {
      try {
        await subscription.unsubscribe();
        console.log('🔌 [Debug] Test subscription unsubscribed');
      } catch (error) {
        console.log('⚠️ [Debug] Unsubscribe failed:', (error as Error).message);
      }
    }, 30000);
    
    return subscription;
  } catch (error) {
    console.error('❌ [Debug] Subscription failed:', (error as Error).message);
    return null;
  }
}

/**
 * Disconnect the backend WebSocket
 * Usage in debugger: window.testBackendDisconnect()
 */
export async function testBackendDisconnect() {
  const service = getBackendWebSocket();
  try {
    console.log('🔌 [Debug] Disconnecting backend WebSocket...');
    await service.disconnect(true); // Clear session
    console.log('✅ [Debug] Backend WebSocket disconnected!');
    return true;
  } catch (error) {
    console.error('❌ [Debug] Disconnect failed:', (error as Error).message);
    return false;
  }
}

// Make functions available globally for debugger access
if (typeof window !== 'undefined') {
  (window as any).testBackendConnect = testBackendConnect;
  (window as any).testBackendMessage = testBackendMessage;
  (window as any).getBackendStatus = getBackendStatus;
  (window as any).testBackendSubscription = testBackendSubscription;
  (window as any).testBackendDisconnect = testBackendDisconnect;
  (window as any).getBackendWebSocket = getBackendWebSocket;
  
  console.log('🚀 [Debug] Backend WebSocket debug helpers loaded!');
  console.log('Available functions:');
  console.log('  - window.testBackendConnect()');
  console.log('  - window.testBackendMessage()');
  console.log('  - window.getBackendStatus()');
  console.log('  - window.testBackendSubscription()');
  console.log('  - window.testBackendDisconnect()');
  console.log('  - window.getBackendWebSocket()');
} 