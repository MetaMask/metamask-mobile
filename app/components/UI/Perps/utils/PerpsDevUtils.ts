/**
 * Development utilities for Perps testing
 * This file is only included in development builds and provides
 * clean testing utilities without polluting production APIs
 */

import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';

/**
 * Development-only utilities for testing Perps functionality
 * These methods are designed to trigger realistic error scenarios
 * without breaking encapsulation of production code
 */
export class PerpsDevUtils {
  /**
   * Simulate a WebSocket connection error by manipulating the underlying connection
   * This triggers the same error handling flow as a real connection failure
   */
  static async simulateConnectionError(): Promise<void> {
    if (!__DEV__) {
      console.warn(
        'PerpsDevUtils.simulateConnectionError() should only be called in development',
      );
      return;
    }

    try {
      // First ensure we're disconnected to start from a clean state
      await PerpsConnectionManager.disconnect();

      // Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Temporarily override the WebSocket URL to an invalid endpoint
      // This will cause a natural connection failure
      const originalFetch = global.fetch;
      global.fetch = () =>
        Promise.reject(new Error('Simulated network failure'));

      try {
        // Attempt to connect - this will fail naturally and trigger error state
        await PerpsConnectionManager.connect();
      } catch (error) {
        // This is expected - the connection should fail
        DevLogger.log(
          '✓ Development: Successfully triggered connection error simulation',
        );
      } finally {
        // Restore original fetch after a delay to ensure error state is captured
        setTimeout(() => {
          global.fetch = originalFetch;
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to simulate connection error:', error);
    }
  }

  /**
   * Reset the connection to a clean state
   * Useful for clearing simulated errors during development
   */
  static async resetConnection(): Promise<void> {
    if (!__DEV__) {
      console.warn(
        'PerpsDevUtils.resetConnection() should only be called in development',
      );
      return;
    }

    try {
      await PerpsConnectionManager.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 200));
      PerpsConnectionManager.resetError();
      await PerpsConnectionManager.connect();
      DevLogger.log('✓ Development: Connection reset complete');
    } catch (error) {
      console.error('Failed to reset connection:', error);
    }
  }
}
