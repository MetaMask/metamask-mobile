import { openE2EUrl } from '../../../framework/DeepLink';
import { E2EDeeplinkSchemes } from '../../../framework/Constants';
import { createLogger } from '../../../framework/logger';
import axios, { AxiosResponse } from 'axios';

const baseUrl = 'http://localhost:2446/e2e/perps/commands';

const logger = createLogger({
  name: 'PerpsE2EModifiers',
});

const makeApiCall = async (
  method: string,
  body: Record<string, unknown>,
): Promise<AxiosResponse> => {
  const url = `${baseUrl}`;
  let response: AxiosResponse;
  if (method === 'POST') {
    response = await axios.post(url, body);
  } else if (method === 'GET') {
    response = await axios.get(url);
  } else {
    throw new Error(`Invalid method: ${method}`);
  }
  logger.debug(
    'CHRIS - API call response',
    'data',
    response.data,
    'status',
    response.status,
  );
  return response;
};

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

  static async newUpdateMarketPrice(
    symbol: string,
    price: string,
  ): Promise<void> {
    const response = await makeApiCall('POST', {
      symbol,
      price,
      type: 'push-price',
    });
    if (response.status !== 200) {
      throw new Error(
        `Failed to update market price: ${response.status} ${response.data}`,
      );
    }
  }

  static async newTriggerLiquidation(symbol: string): Promise<void> {
    const response = await makeApiCall('POST', {
      symbol,
      type: 'force-liquidation',
    });
    if (response.status !== 200) {
      throw new Error(
        `Failed to trigger liquidation: ${response.status} ${response.data}`,
      );
    }
  }

  static async applyDepositUSD(amount: string): Promise<void> {
    await openE2EUrl(
      `${E2EDeeplinkSchemes.PERPS}mock-deposit?amount=${encodeURIComponent(
        amount,
      )}`,
    );
  }

  static async newApplyDepositUSD(amount: string): Promise<void> {
    const response = await makeApiCall('POST', {
      amount,
      type: 'mock-deposit',
    });
    if (response.status !== 200) {
      throw new Error(
        `Failed to apply deposit: ${response.status} ${response.data}`,
      );
    }
  }
}

export default PerpsE2EModifiers;
