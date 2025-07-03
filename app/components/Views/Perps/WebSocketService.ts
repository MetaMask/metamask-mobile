import Logger from '../../../util/Logger';

class HyperliquidWebSocketService {
  private ws: WebSocket | null = null;
  private readonly url = 'wss://api.hyperliquid.xyz/ws';
  private isConnected = false;
  private subscriptions: Set<string> = new Set();

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      Logger.log('HyperliquidWebSocket: Attempting to connect to', this.url);

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        Logger.log('HyperliquidWebSocket: Connection established');
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        Logger.log('HyperliquidWebSocket: Connection closed', {
          code: event.code,
          reason: event.reason,
        });
      };

      this.ws.onerror = (error) => {
        Logger.log('HyperliquidWebSocket: Connection error:', error);
      };
    } catch (error) {
      Logger.log('HyperliquidWebSocket: Failed to create connection:', error);
    }
  }

  private handleMessage(data: { channel?: string; data?: unknown }): void {
    if (data.channel === 'subscriptionResponse') {
      Logger.log('HyperliquidWebSocket: Subscription confirmed:', data.data);
    } else if (data.channel === 'candle') {
      Logger.log('HyperliquidWebSocket: Received candle data:', data.data);
    } else {
      Logger.log('HyperliquidWebSocket: Received message:', data);
    }
  }

  public subscribeToCandleData(coin: string, interval: string = '1h'): void {
    if (!this.isConnected || !this.ws) {
      Logger.log('HyperliquidWebSocket: Cannot subscribe - not connected');
      return;
    }

    const subscriptionKey = `candle_${coin}_${interval}`;

    if (this.subscriptions.has(subscriptionKey)) {
      Logger.log(
        'HyperliquidWebSocket: Already subscribed to',
        subscriptionKey,
      );
      return;
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
    this.ws.send(JSON.stringify(subscriptionMessage));
    this.subscriptions.add(subscriptionKey);
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
