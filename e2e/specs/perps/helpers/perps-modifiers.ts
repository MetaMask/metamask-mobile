import { openE2EUrl } from '../../../../tests/framework/DeepLink';
import { E2EDeeplinkSchemes } from '../../../../tests/framework/Constants';
import { createLogger } from '../../../../tests/framework/logger';
import CommandQueueServer, {
  CommandQueueItem,
} from '../../../../tests/framework/fixtures/CommandQueueServer';
import { PerpsModifiersCommandTypes } from '../../../../tests/framework/types';

const logger = createLogger({
  name: 'PerpsE2EModifiers',
});

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

  static async applyDepositUSD(amount: string): Promise<void> {
    await openE2EUrl(
      `${E2EDeeplinkSchemes.PERPS}mock-deposit?amount=${encodeURIComponent(
        amount,
      )}`,
    );
  }

  /**
   *
   * @param commandQueueServer - The command queue server to add the command to
   * @param symbol - The symbol to update the price for
   * @param price - The price to update the symbol to
   * @returns void
   */
  static async updateMarketPriceServer(
    commandQueueServer: CommandQueueServer,
    symbol: string,
    price: string,
  ): Promise<void> {
    logger.debug('Updating market price for symbol', symbol, 'to price', price);
    const command: CommandQueueItem = {
      type: PerpsModifiersCommandTypes.pushPrice,
      args: { symbol, price },
    };
    await commandQueueServer.addToQueue(command);
  }

  /**
   *
   * @param commandQueueServer - The command queue server to add the command to
   * @param symbol - The symbol to trigger the liquidation for
   * @returns void
   */
  static async triggerLiquidationServer(
    commandQueueServer: CommandQueueServer,
    symbol: string,
  ): Promise<void> {
    logger.debug('Triggering liquidation for symbol', symbol);
    const command: CommandQueueItem = {
      type: PerpsModifiersCommandTypes.forceLiquidation,
      args: { symbol },
    };
    await commandQueueServer.addToQueue(command);
  }

  /**
   *
   * @param commandQueueServer - The command queue server to add the command to
   * @param amount - The amount to apply the deposit for
   * @returns void
   */
  static async applyDepositUSDServer(
    commandQueueServer: CommandQueueServer,
    amount: string,
  ): Promise<void> {
    logger.debug('Applying deposit USD for amount', amount);
    const command: CommandQueueItem = {
      type: PerpsModifiersCommandTypes.mockDeposit,
      args: { amount },
    };
    await commandQueueServer.addToQueue(command);
  }
}

export default PerpsE2EModifiers;
