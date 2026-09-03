import { openE2EUrl } from '../../framework/DeepLink';
import { E2EDeeplinkSchemes } from '../../framework/Constants';
import { createLogger } from '../../framework/logger';
import CommandQueueServer, {
  CommandQueueItem,
} from '../../framework/fixtures/CommandQueueServer';
import { E2ECommandTypes } from '../../framework/types';
import Utilities from '../../framework/Utilities';

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
      type: E2ECommandTypes.pushPrice,
      args: { symbol, price },
    };
    await commandQueueServer.addToQueue(command);
  }

  /**
   * Pushes a mark price, then polls until `assertClosed` succeeds.
   * Re-enqueues the same push periodically so a busy app that misses one
   * command-queue poll still receives the SL/TP trigger price.
   */
  static async waitForCloseAfterPricePush(
    commandQueueServer: CommandQueueServer,
    symbol: string,
    price: string,
    assertClosed: () => Promise<void>,
    options: {
      timeout?: number;
      interval?: number;
      reenqueueEveryMs?: number;
      description?: string;
    } = {},
  ): Promise<void> {
    const {
      timeout = 30000,
      interval = 1000,
      reenqueueEveryMs = 5000,
      description = 'wait for position close after mark price push',
    } = options;

    await this.updateMarketPriceServer(commandQueueServer, symbol, price);

    let lastEnqueueAt = Date.now();
    await Utilities.executeWithRetry(
      async () => {
        if (Date.now() - lastEnqueueAt >= reenqueueEveryMs) {
          await this.updateMarketPriceServer(
            commandQueueServer,
            symbol,
            price,
          );
          lastEnqueueAt = Date.now();
        }
        await assertClosed();
      },
      {
        interval,
        timeout,
        description,
      },
    );
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
      type: E2ECommandTypes.forceLiquidation,
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
      type: E2ECommandTypes.mockDeposit,
      args: { amount },
    };
    await commandQueueServer.addToQueue(command);
  }
}

export default PerpsE2EModifiers;
