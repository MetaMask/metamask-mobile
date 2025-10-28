import { openE2EUrl } from '../../../framework/DeepLink';
import { E2EDeeplinkSchemes } from '../../../framework/Constants';

class PerpsE2EModifiers {
  static async updateMarketPrice(symbol: string, price: string): Promise<void> {
    await openE2EUrl(
      `${E2EDeeplinkSchemes.PERPS}push-price?symbol=${encodeURIComponent(
        symbol,
      )}&price=${encodeURIComponent(price)}`,
    );
  }

  static async triggerLiquidation(symbol: string): Promise<void> {
    await openE2EUrl(
      `${E2EDeeplinkSchemes.PERPS}force-liquidation?symbol=${encodeURIComponent(
        symbol,
      )}`,
    );
  }
}

export default PerpsE2EModifiers;
