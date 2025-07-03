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

interface RawCandleData {
  t?: number;
  time?: number;
  o?: string;
  open?: string;
  h?: string;
  high?: string;
  l?: string;
  low?: string;
  c?: string;
  close?: string;
  v?: string;
  volume?: string;
}

class HyperliquidWebSocketService {
  private ws: WebSocket | null = null;
  private readonly url = 'wss://api.hyperliquid.xyz/ws';
  private readonly httpUrl = 'https://api.hyperliquid.xyz/info';
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
      // Handle the actual format from Hyperliquid WebSocket
      const rawCandle = rawData as {
        s: string; // symbol
        i: string; // interval
        t: number; // start time
        T: number; // end time
        o: string; // open
        h: string; // high
        l: string; // low
        c: string; // close
        v: string; // volume
        n: number; // number of trades
      };

      if (rawCandle?.s && rawCandle?.i) {
        const subscriptionKey = `candle_${rawCandle.s}_${rawCandle.i}`;

        // Get existing data or create new
        const existingData = this.candleData.get(subscriptionKey);
        const newCandle = {
          time: rawCandle.t,
          open: rawCandle.o,
          high: rawCandle.h,
          low: rawCandle.l,
          close: rawCandle.c,
          volume: rawCandle.v,
        };

        let updatedData: CandleData;

        if (existingData) {
          // Check if this candle already exists (same timestamp)
          const existingIndex = existingData.candles.findIndex(
            (c) => c.time === rawCandle.t,
          );

          if (existingIndex >= 0) {
            // Update existing candle
            existingData.candles[existingIndex] = newCandle;
            updatedData = existingData;
            Logger.log(
              'HyperliquidWebSocket: Updated existing candle for',
              rawCandle.s,
              'at timestamp',
              rawCandle.t,
            );
          } else {
            // Append new candle and keep sorted by time
            existingData.candles.push(newCandle);
            existingData.candles.sort((a, b) => a.time - b.time);
            updatedData = existingData;
            Logger.log(
              'HyperliquidWebSocket: Appended new candle for',
              rawCandle.s,
              'Total candles:',
              existingData.candles.length,
            );
          }
        } else {
          // Create new data with single candle
          updatedData = {
            coin: rawCandle.s,
            interval: rawCandle.i,
            candles: [newCandle],
          };
          Logger.log(
            'HyperliquidWebSocket: Created new candle data for',
            rawCandle.s,
          );
        }

        this.candleData.set(subscriptionKey, updatedData);

        // Call callback if registered
        const callback = this.candleCallbacks.get(subscriptionKey);
        if (callback) {
          callback(updatedData);
        }

        Logger.log(
          'HyperliquidWebSocket: Processed candle update for',
          rawCandle.s,
          'OHLCV:',
          `O:${rawCandle.o} H:${rawCandle.h} L:${rawCandle.l} C:${rawCandle.c} V:${rawCandle.v}`,
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

  // Fetch historical candle data via HTTP
  public async fetchHistoricalCandles(
    coin: string,
    interval: string = '1h',
    limit: number = 100,
  ): Promise<CandleData | null> {
    try {
      Logger.log(
        'HyperliquidWebSocket: Fetching historical candles for',
        coin,
        'interval:',
        interval,
        'limit:',
        limit,
      );

      const response = await fetch(this.httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin,
            interval,
            startTime: Date.now() - limit * 60 * 60 * 1000, // limit hours ago
            endTime: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        Logger.log(
          'HyperliquidWebSocket: Historical candles fetch failed:',
          response.status,
        );
        return null;
      }

      const rawData = await response.json();
      Logger.log('HyperliquidWebSocket: Historical candles response:', rawData);

      // Process the response - format may vary, let's handle both possible formats
      if (Array.isArray(rawData)) {
        const processedCandles = rawData.map((candle: RawCandleData) => ({
          time: candle.t || candle.time || 0,
          open: candle.o || candle.open || '0',
          high: candle.h || candle.high || '0',
          low: candle.l || candle.low || '0',
          close: candle.c || candle.close || '0',
          volume: candle.v || candle.volume || '0',
        }));

        const historicalData: CandleData = {
          coin,
          interval,
          candles: processedCandles,
        };

        // Store in cache
        const subscriptionKey = `candle_${coin}_${interval}`;
        this.candleData.set(subscriptionKey, historicalData);

        Logger.log(
          'HyperliquidWebSocket: Processed',
          processedCandles.length,
          'historical candles for',
          coin,
        );

        return historicalData;
      }

      return null;
    } catch (error) {
      Logger.log(
        'HyperliquidWebSocket: Error fetching historical candles:',
        error,
      );
      return null;
    }
  }
}

export default HyperliquidWebSocketService;
