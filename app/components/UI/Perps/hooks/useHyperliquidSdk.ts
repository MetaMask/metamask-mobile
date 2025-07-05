import { useMemo } from 'react';
import {
  HttpTransport,
  InfoClient,
  WebSocketTransport,
  SubscriptionClient,
} from '@deeeed/hyperliquid-node20';

export interface HyperliquidSdkClients {
  /**
   * InfoClient for HTTP-based data fetching
   */
  infoClient: InfoClient;
  /**
   * SubscriptionClient for WebSocket-based real-time data
   */
  subscriptionClient: SubscriptionClient;
  /**
   * Raw HTTP transport instance
   */
  httpTransport: HttpTransport;
  /**
   * Raw WebSocket transport instance
   */
  webSocketTransport: WebSocketTransport;
}

/**
 * Singleton class to manage HyperLiquid SDK clients
 * Ensures only one instance of each client exists across the entire app
 */
class HyperliquidSdkManager {
  private static instance: HyperliquidSdkManager;
  private _httpTransport: HttpTransport | null = null;
  private _webSocketTransport: WebSocketTransport | null = null;
  private _infoClient: InfoClient | null = null;
  private _subscriptionClient: SubscriptionClient | null = null;

  private constructor() {}

  static getInstance(): HyperliquidSdkManager {
    if (!HyperliquidSdkManager.instance) {
      HyperliquidSdkManager.instance = new HyperliquidSdkManager();
    }
    return HyperliquidSdkManager.instance;
  }

  get httpTransport(): HttpTransport {
    if (!this._httpTransport) {
      this._httpTransport = new HttpTransport();
    }
    return this._httpTransport;
  }

  get webSocketTransport(): WebSocketTransport {
    if (!this._webSocketTransport) {
      this._webSocketTransport = new WebSocketTransport();
    }
    return this._webSocketTransport;
  }

  get infoClient(): InfoClient {
    if (!this._infoClient) {
      this._infoClient = new InfoClient({ transport: this.httpTransport });
    }
    return this._infoClient;
  }

  get subscriptionClient(): SubscriptionClient {
    if (!this._subscriptionClient) {
      this._subscriptionClient = new SubscriptionClient({ transport: this.webSocketTransport });
    }
    return this._subscriptionClient;
  }

  /**
   * Clean up all clients and transports
   * Call this when the app is shutting down or when you need to reset connections
   */
  cleanup(): void {
    this._httpTransport = null;
    this._webSocketTransport = null;
    this._infoClient = null;
    this._subscriptionClient = null;
  }
}

/**
 * Hook to access HyperLiquid SDK clients
 * Returns the same singleton instances across all components that use this hook
 */
export const useHyperliquidSdk = (): HyperliquidSdkClients => {
  const sdkManager = useMemo(() => HyperliquidSdkManager.getInstance(), []);

  return useMemo(() => ({
    infoClient: sdkManager.infoClient,
    subscriptionClient: sdkManager.subscriptionClient,
    httpTransport: sdkManager.httpTransport,
    webSocketTransport: sdkManager.webSocketTransport,
  }), [sdkManager]);
};