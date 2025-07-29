/**
 * Backend Platform Controllers for MetaMask Mobile
 * 
 * This module provides mobile-specific implementations of backend platform services
 * that avoid naming conflicts with existing services.
 */

export { WebSocketServiceInit } from './websocket-service-init';
export { AccountActivityServiceInit } from './account-activity-service-init';

/**
 * Mobile-specific WebSocketService that prevents conflicts with the snaps WebSocketService.
 * 
 * Usage:
 * ```typescript
 * import Engine from '../Engine';
 * 
 * // Access the service through Engine context
 * const backendWebSocket = Engine.context.BackendWebSocketService;
 * 
 * // Connect to backend
 * await backendWebSocket.connect();
 * 
 * // Send messages
 * await backendWebSocket.sendMessage({
 *   event: 'my-event',
 *   data: { requestId: 'req-123', payload: 'data' }
 * });
 * 
 * // Subscribe to notifications
 * const subscription = await backendWebSocket.subscribe({
 *   namespace: 'account-activity.v1',
 *   channels: ['balance-updates'],
 *   callback: (notification) => console.log('Received:', notification)
 * });
 * ```
 */
export { MobileBackendWebSocketService } from './websocket-service-init';

/**
 * AccountActivityService for monitoring real-time account transactions and balance changes.
 * 
 * This service automatically subscribes to all existing accounts and monitors for:
 * - Transaction updates (new transactions, status changes)
 * - Balance changes (token balances, native currency)
 * - Account additions/removals (auto-subscribe/unsubscribe)
 * 
 * Usage:
 * ```typescript
 * import Engine from '../Engine';
 * 
 * // Access the service through Engine context
 * const accountActivity = Engine.context.AccountActivityService;
 * 
 * // Subscribe to a specific account (CAIP-10 format)
 * await accountActivity.subscribeAccounts({
 *   address: 'eip155:0:0x1234567890123456789012345678901234567890'
 * });
 * 
 * // Unsubscribe from an account
 * await accountActivity.unsubscribeAccounts(
 *   'eip155:0:0x1234567890123456789012345678901234567890'
 * );
 * ```
 * 
 * Debug Functions (available in React Native debugger):
 * ```javascript
 * // Subscribe to all existing accounts
 * window.testSubscribeAllAccounts()
 * 
 * // Subscribe to a specific address
 * window.testSubscribeAccount('eip155:0:0x1234...')
 * 
 * // Check subscription status
 * window.getAccountActivityStatus()
 * 
 * // Test with sample address
 * window.testWithSampleAddress()
 * ```
 */ 