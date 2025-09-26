import { openE2EUrl } from './DeepLink';

class PerpsE2E {
  static async updateMarketPrice(symbol: string, price: string): Promise<void> {
    await openE2EUrl(
      `e2e://perps/push-price?symbol=${encodeURIComponent(
        symbol,
      )}&price=${encodeURIComponent(price)}`,
    );
  }

  static async triggerLiquidation(symbol: string): Promise<void> {
    await openE2EUrl(
      `e2e://perps/force-liquidation?symbol=${encodeURIComponent(symbol)}`,
    );
  }
}

export default PerpsE2E;
