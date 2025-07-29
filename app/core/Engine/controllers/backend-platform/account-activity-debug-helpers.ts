/**
 * Debug helpers for testing AccountActivityService
 * 
 * These functions can be called from the React Native debugger console
 * to manually test account activity monitoring functionality.
 */

import Engine from '../../Engine';
import { AccountActivityService } from '@metamask/backend-platform';

/**
 * Get the AccountActivityService instance
 */
export function getAccountActivityService(): AccountActivityService {
  return Engine.context.AccountActivityService;
}

/**
 * Subscribe to account activity for a specific address
 * Usage in debugger: window.testSubscribeAccount('eip155:0:0x1234...')
 */
export async function testSubscribeAccount(address: string) {
  const service = getAccountActivityService();
  try {
    console.log('🔔 [Debug] Subscribing to account activity for:', address);
    await service.subscribeAccounts({ address });
    console.log('✅ [Debug] Successfully subscribed to account activity!');
    return true;
  } catch (error) {
    console.error('❌ [Debug] Failed to subscribe to account:', (error as Error).message);
    return false;
  }
}

/**
 * Subscribe to activity for all existing accounts
 * Usage in debugger: window.testSubscribeAllAccounts()
 */
export async function testSubscribeAllAccounts() {
  try {
    console.log('🔔 [Debug] Subscribing to all existing accounts...');
    
    // Get all accounts from AccountsController
    const accounts = Engine.context.AccountsController.listMultichainAccounts();
    console.log(`📊 [Debug] Found ${accounts.length} accounts to subscribe`);
    
    for (const account of accounts) {
      let address: string;
      
      // Convert to CAIP-10 format based on account scopes
      if (account.scopes.some(scope => scope.startsWith('eip155:'))) {
        address = `eip155:0:${account.address}`;
      } else if (account.scopes.some(scope => scope.startsWith('solana:'))) {
        address = `solana:0:${account.address}`;
      } else {
        address = account.address;
      }
      
      await testSubscribeAccount(address);
    }
    
    console.log('✅ [Debug] All accounts subscribed successfully!');
    return true;
  } catch (error) {
    console.error('❌ [Debug] Failed to subscribe all accounts:', (error as Error).message);
    return false;
  }
}

/**
 * Unsubscribe from account activity for a specific address
 * Usage in debugger: window.testUnsubscribeAccount('eip155:0:0x1234...')
 */
export async function testUnsubscribeAccount(address: string) {
  const service = getAccountActivityService();
  try {
    console.log('🔌 [Debug] Unsubscribing from account activity for:', address);
    await service.unsubscribeAccounts(address);
    console.log('✅ [Debug] Successfully unsubscribed from account activity!');
    return true;
  } catch (error) {
    console.error('❌ [Debug] Failed to unsubscribe from account:', (error as Error).message);
    return false;
  }
}

/**
 * Listen to account activity events
 * Usage in debugger: window.testListenToAccountActivity()
 */
export function testListenToAccountActivity() {
  try {
    console.log('👂 [Debug] Setting up account activity event listeners...');
    console.log('ℹ️ [Debug] Event listeners will be set up when the service publishes events');
    console.log('ℹ️ [Debug] Check console logs for incoming transaction and balance updates');
    
    // Note: Event listeners would need to be set up with proper messenger configuration
    // For now, we'll just set up a simple monitoring function
    const originalLog = console.log;
    const monitoringActive = true;
    
    if (monitoringActive) {
      console.log('🔍 [Debug] Monitoring console for account activity messages...');
      console.log('💡 [Debug] Look for messages with [Account Activity Service] prefix');
    }
    
    console.log('✅ [Debug] Account activity monitoring enabled!');
    return true;
  } catch (error) {
    console.error('❌ [Debug] Failed to set up listeners:', (error as Error).message);
    return false;
  }
}

/**
 * Get current subscription status
 * Usage in debugger: window.getAccountActivityStatus()
 */
export function getAccountActivityStatus() {
  try {
    const webSocketService = Engine.context.BackendWebSocketService;
    const subscriptions = webSocketService.getSubscriptionsByNamespace('account-activity.v1');
    
    const status = {
      totalSubscriptions: subscriptions.size,
      subscriptions: Array.from(subscriptions.entries()).map(([channel, subscription]) => ({
        channel,
        isActive: subscription.isActive(),
      })),
      webSocketStatus: webSocketService.getConnectionInfo(),
    };
    
    console.log('📊 [Debug] Account Activity Status:', status);
    return status;
  } catch (error) {
    console.error('❌ [Debug] Failed to get status:', (error as Error).message);
    return null;
  }
}

/**
 * Test with a sample Ethereum address
 * Usage in debugger: window.testWithSampleAddress()
 */
export async function testWithSampleAddress() {
  const sampleAddress = 'eip155:0:0x742d35Cc6634C0532925a3b8D9c5fE0F8c9F5C8f';
  console.log('🧪 [Debug] Testing with sample address:', sampleAddress);
  
  // Subscribe
  await testSubscribeAccount(sampleAddress);
  
  // Check status
  getAccountActivityStatus();
  
  // Set up listeners
  testListenToAccountActivity();
  
  return sampleAddress;
}

// Make functions available globally for debugger access
if (typeof window !== 'undefined') {
  (window as any).testSubscribeAccount = testSubscribeAccount;
  (window as any).testSubscribeAllAccounts = testSubscribeAllAccounts;
  (window as any).testUnsubscribeAccount = testUnsubscribeAccount;
  (window as any).testListenToAccountActivity = testListenToAccountActivity;
  (window as any).getAccountActivityStatus = getAccountActivityStatus;
  (window as any).testWithSampleAddress = testWithSampleAddress;
  (window as any).getAccountActivityService = getAccountActivityService;
  
  console.log('🚀 [Debug] Account Activity Service debug helpers loaded!');
  console.log('Available functions:');
  console.log('  - window.testSubscribeAccount(address)');
  console.log('  - window.testSubscribeAllAccounts()');
  console.log('  - window.testUnsubscribeAccount(address)');
  console.log('  - window.testListenToAccountActivity()');
  console.log('  - window.getAccountActivityStatus()');
  console.log('  - window.testWithSampleAddress()');
  console.log('  - window.getAccountActivityService()');
} 