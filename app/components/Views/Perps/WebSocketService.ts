import Logger from '../../../util/Logger';

interface CandleData {
  coin: string;
  interval: string;
  candles: {
    time: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }[];
}

interface PendingSubscription {
  coin: string;
  interval: string;
  callback?: (data: CandleData) => void;
}

class HyperliquidWebSocketService {
  private ws: WebSocket | null = null;
  private readonly url = 'wss://api.hyperliquid.xyz/ws';
  private isConnected = false;
  private subscriptions: Set<string> = new Set();
  private candleData: Map<string, CandleData> = new Map();
  private candleCallbacks: Map<string, (data: CandleData) => void> = new Map();
  private pendingSubscriptions: PendingSubscription[] = [];

  constructor() {
    this.testNetworkConnectivity().then(() => {
      this.connect();
    });
  }

  private async testNetworkConnectivity(): Promise<void> {
    try {
      Logger.log('HyperliquidWebSocket: Testing network connectivity...');

      // Test basic HTTP connectivity to Hyperliquid API
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'meta',
        }),
      });

      if (response.ok) {
        Logger.log('HyperliquidWebSocket: Network connectivity test passed');
      } else {
        Logger.log(
          'HyperliquidWebSocket: Network connectivity test failed:',
          response.status,
        );
      }
    } catch (error) {
      Logger.log(
        'HyperliquidWebSocket: Network connectivity test error:',
        error,
      );
    }
  }

  private connect(): void {
    try {
      Logger.log('HyperliquidWebSocket: Attempting to connect to', this.url);
      Logger.log(
        'HyperliquidWebSocket: WebSocket constructor available:',
        typeof WebSocket,
      );
      Logger.log(
        'HyperliquidWebSocket: Current platform:',
        global.navigator?.userAgent || 'Unknown',
      );

      // Check if WebSocket is available
      if (typeof WebSocket === 'undefined') {
        Logger.log(
          'HyperliquidWebSocket: WebSocket not available in this environment',
        );
        return;
      }

      // Create WebSocket instance for React Native
      this.ws = new WebSocket(this.url);

      Logger.log(
        'HyperliquidWebSocket: WebSocket instance created, readyState:',
        this.ws.readyState,
      );
      Logger.log('HyperliquidWebSocket: WebSocket URL:', this.ws.url);

      this.ws.onopen = (_event) => {
        this.isConnected = true;
        Logger.log('HyperliquidWebSocket: Connection established successfully');
        Logger.log('HyperliquidWebSocket: Open event details:', {
          readyState: this.ws?.readyState,
          url: this.ws?.url,
          protocol: this.ws?.protocol,
        });

        // Process any pending subscriptions
        this.processPendingSubscriptions();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          Logger.log('HyperliquidWebSocket: Failed to parse message:', error);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        Logger.log('HyperliquidWebSocket: Connection closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        // Auto-reconnect for abnormal closures (code 1006) after a delay
        if (event.code === 1006 && !event.wasClean) {
          Logger.log(
            'HyperliquidWebSocket: Abnormal closure detected, reconnecting in 3 seconds...',
          );
          setTimeout(() => {
            if (!this.isConnected) {
              this.connect();
            }
          }, 3000);
        }
      };

      this.ws.onerror = (error) => {
        this.isConnected = false;
        Logger.log('HyperliquidWebSocket: Connection error occurred');

        const wsTarget = error.target as WebSocket;
        Logger.log('HyperliquidWebSocket: Error details:', {
          type: error.type,
          isTrusted: error.isTrusted,
          targetReadyState: wsTarget?.readyState,
          targetUrl: wsTarget?.url,
          targetProtocol: wsTarget?.protocol,
        });
        Logger.log(
          'HyperliquidWebSocket: WebSocket readyState:',
          this.ws?.readyState,
        );

        // Map readyState to human-readable values
        const readyStateMap = {
          0: 'CONNECTING',
          1: 'OPEN',
          2: 'CLOSING',
          3: 'CLOSED',
        };
        Logger.log(
          'HyperliquidWebSocket: ReadyState meaning:',
          readyStateMap[this.ws?.readyState as keyof typeof readyStateMap] ||
            'UNKNOWN',
        );
      };
    } catch (error) {
      Logger.log('HyperliquidWebSocket: Failed to create connection:', error);
    }
  }

  private processPendingSubscriptions(): void {
    if (this.pendingSubscriptions.length === 0) {
      return;
    }

    Logger.log(
      'HyperliquidWebSocket: Processing',
      this.pendingSubscriptions.length,
      'pending subscriptions',
    );

    const toProcess = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];

    toProcess.forEach((subscription) => {
      this.subscribeToCandleData(
        subscription.coin,
        subscription.interval,
        subscription.callback,
      );
    });
  }

  private handleMessage(data: { channel?: string; data?: unknown }): void {
    if (data.channel === 'subscriptionResponse') {
      Logger.log('HyperliquidWebSocket: Subscription confirmed:', data.data);
    } else if (data.channel === 'candle') {
      Logger.log('HyperliquidWebSocket: Received candle data:', data.data);
      this.processCandleData(data.data);
    } else {
      Logger.log('HyperliquidWebSocket: Received message:', data);
    }
  }

  private processCandleData(rawData: unknown): void {
    try {
      const candleArray = rawData as {
        coin: string;
        interval: string;
        candles: {
          time: number;
          open: string;
          high: string;
          low: string;
          close: string;
          volume: string;
        }[];
      };

      if (candleArray?.coin && candleArray?.candles) {
        const subscriptionKey = `candle_${candleArray.coin}_${candleArray.interval}`;

        const processedData: CandleData = {
          coin: candleArray.coin,
          interval: candleArray.interval,
          candles: candleArray.candles,
        };

        this.candleData.set(subscriptionKey, processedData);

        // Call callback if registered
        const callback = this.candleCallbacks.get(subscriptionKey);
        if (callback) {
          callback(processedData);
        }

        Logger.log(
          'HyperliquidWebSocket: Processed candle data for',
          candleArray.coin,
          'with',
          candleArray.candles.length,
          'candles',
        );
      }
    } catch (error) {
      Logger.log('HyperliquidWebSocket: Error processing candle data:', error);
    }
  }

  public subscribeToCandleData(
    coin: string,
    interval: string = '1h',
    callback?: (data: CandleData) => void,
  ): void {
    Logger.log(
      'HyperliquidWebSocket: Now subscribing to candle data for',
      coin,
    );

    const subscriptionKey = `candle_${coin}_${interval}`;

    if (this.subscriptions.has(subscriptionKey)) {
      Logger.log(
        'HyperliquidWebSocket: Already subscribed to',
        subscriptionKey,
      );
      return;
    }

    // If not connected, queue the subscription
    if (!this.isConnected || !this.ws) {
      Logger.log(
        'HyperliquidWebSocket: Not connected, queuing subscription for',
        coin,
      );
      this.pendingSubscriptions.push({
        coin,
        interval,
        callback,
      });
      return;
    }

    // Register callback if provided
    if (callback) {
      this.candleCallbacks.set(subscriptionKey, callback);
    }

    const subscriptionMessage = {
      method: 'subscribe',
      subscription: {
        type: 'candle',
        coin,
        interval,
      },
    };

    Logger.log(
      'HyperliquidWebSocket: Subscribing to candle data:',
      subscriptionMessage,
    );

    try {
      this.ws.send(JSON.stringify(subscriptionMessage));
      this.subscriptions.add(subscriptionKey);
      Logger.log(
        'HyperliquidWebSocket: Subscription message sent successfully',
      );
    } catch (error) {
      Logger.log('HyperliquidWebSocket: Failed to send subscription:', error);
    }
  }

  public getLatestCandleData(
    coin: string,
    interval: string = '1h',
  ): CandleData | null {
    const subscriptionKey = `candle_${coin}_${interval}`;
    return this.candleData.get(subscriptionKey) || null;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.subscriptions.clear();
      Logger.log('HyperliquidWebSocket: Disconnected');
    }
  }
}

export default HyperliquidWebSocketService;
