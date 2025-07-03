import Logger from '../../../util/Logger';

class HyperliquidWebSocketService {
  private ws: WebSocket | null = null;
  private readonly url = 'wss://api.hyperliquid.xyz/ws';
  private isConnected = false;

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
        Logger.log('HyperliquidWebSocket: Received message:', data);
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

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      Logger.log('HyperliquidWebSocket: Disconnected');
    }
  }
}

export default HyperliquidWebSocketService;
