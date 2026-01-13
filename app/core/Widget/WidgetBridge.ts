/**
 * WidgetBridge - Native module for iOS Widget communication
 *
 * This module provides the interface between React Native and the iOS WidgetKit extension.
 * It allows the app to push account and balance data to the widget via App Groups.
 */

import { NativeModules, Platform } from 'react-native';

// Types for widget data
export interface WidgetAccount {
  id: string;
  name: string;
  address: string;
  type: 'eoa' | 'smart' | 'hardware' | string;
}

export interface WidgetBalance {
  accountId: string;
  totalFiatBalance: number;
  currency: string;
}

export interface WidgetData {
  accounts: WidgetAccount[];
  balances: WidgetBalance[];
  currency: string;
}

// Native module interface
interface WidgetBridgeModule {
  updateAccounts(accounts: WidgetAccount[]): Promise<boolean>;
  updateBalances(balances: WidgetBalance[]): Promise<boolean>;
  updateWidgetData(data: WidgetData): Promise<boolean>;
  clearWidgetData(): Promise<boolean>;
  refreshWidget(): Promise<boolean>;
  isWidgetSupported(): Promise<boolean>;
}

// Get the native module (only available on iOS)
const NativeWidgetBridge: WidgetBridgeModule | undefined =
  Platform.OS === 'ios' ? NativeModules.WidgetBridge : undefined;

/**
 * WidgetBridge class for managing iOS widget data
 */
class WidgetBridge {
  private static instance: WidgetBridge;

  // eslint-disable-next-line no-empty-function
  private constructor() {}

  static getInstance(): WidgetBridge {
    if (!WidgetBridge.instance) {
      WidgetBridge.instance = new WidgetBridge();
    }
    return WidgetBridge.instance;
  }

  /**
   * Check if widgets are supported on this device
   */
  async isSupported(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      return (await NativeWidgetBridge?.isWidgetSupported()) ?? false;
    } catch (error) {
      console.warn('[WidgetBridge] Error checking widget support:', error);
      return false;
    }
  }

  /**
   * Update widget accounts
   * @param accounts Array of account objects
   */
  async updateAccounts(accounts: WidgetAccount[]): Promise<boolean> {
    if (!NativeWidgetBridge) {
      console.warn('[WidgetBridge] Not available on this platform');
      return false;
    }

    try {
      return await NativeWidgetBridge.updateAccounts(accounts);
    } catch (error) {
      console.error('[WidgetBridge] Error updating accounts:', error);
      return false;
    }
  }

  /**
   * Update widget balances
   * @param balances Array of balance objects
   */
  async updateBalances(balances: WidgetBalance[]): Promise<boolean> {
    if (!NativeWidgetBridge) {
      console.warn('[WidgetBridge] Not available on this platform');
      return false;
    }

    try {
      return await NativeWidgetBridge.updateBalances(balances);
    } catch (error) {
      console.error('[WidgetBridge] Error updating balances:', error);
      return false;
    }
  }

  /**
   * Update all widget data at once
   * @param data Object containing accounts, balances, and currency
   */
  async updateWidgetData(data: WidgetData): Promise<boolean> {
    if (!NativeWidgetBridge) {
      console.warn('[WidgetBridge] Not available on this platform');
      return false;
    }

    try {
      return await NativeWidgetBridge.updateWidgetData(data);
    } catch (error) {
      console.error('[WidgetBridge] Error updating widget data:', error);
      return false;
    }
  }

  /**
   * Clear all widget data (call on logout)
   */
  async clearData(): Promise<boolean> {
    if (!NativeWidgetBridge) {
      console.warn('[WidgetBridge] Not available on this platform');
      return false;
    }

    try {
      return await NativeWidgetBridge.clearWidgetData();
    } catch (error) {
      console.error('[WidgetBridge] Error clearing widget data:', error);
      return false;
    }
  }

  /**
   * Force widget refresh
   */
  async refresh(): Promise<boolean> {
    if (!NativeWidgetBridge) {
      console.warn('[WidgetBridge] Not available on this platform');
      return false;
    }

    try {
      return await NativeWidgetBridge.refreshWidget();
    } catch (error) {
      console.error('[WidgetBridge] Error refreshing widget:', error);
      return false;
    }
  }
}

// Export singleton instance
export const widgetBridge = WidgetBridge.getInstance();

export default WidgetBridge;
