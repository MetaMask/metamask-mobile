import { Order, OrderStatusEnum } from '@consensys/on-ramp-sdk';
import AppConstants from '../../../../core/AppConstants';
import { CustomIdData } from '../../../../reducers/fiatOrders/types';
import { SDK } from '../sdk';

export const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
export const POLLING_FRECUENCY_IN_SECONDS = POLLING_FREQUENCY / 1000;
export const MAX_ERROR_COUNT = 5;

export function createCustomOrderIdData(
  id: string,
  chainId: string,
  account: string,
): CustomIdData {
  return {
    id,
    chainId,
    account,
    createdAt: Date.now(),
    lastTimeFetched: 0,
    errorCount: 0,
  };
}

export default async function processCustomOrderIdData(
  customOrderIdData: CustomIdData,
): Promise<[CustomIdData, Order | null]> {
  const now = Date.now();

  /**
   * If the custom order had errors, we don't fetch it unless
   * POLLING_FRECUENCY ^ (errorCount + 1) seconds has passed
   */
  if (
    customOrderIdData.errorCount > 0 &&
    customOrderIdData.lastTimeFetched +
      Math.pow(POLLING_FRECUENCY_IN_SECONDS, customOrderIdData.errorCount + 1) *
        1000 >
      now
  ) {
    return [customOrderIdData, null];
  }

  try {
    const orders = await SDK.orders();
    const updatedCustomOrderIdData = await orders.getOrder(
      customOrderIdData.id,
      customOrderIdData.account,
    );

    if (updatedCustomOrderIdData.status === OrderStatusEnum.Unknown) {
      /** This represents an error, we update the error count and the
       * last time fetched, unless it is the 6th error count, then
       * we expire the custom order id */

      if (customOrderIdData.errorCount === MAX_ERROR_COUNT) {
        return [{ ...customOrderIdData, expired: true }, null];
      }

      return [
        {
          ...customOrderIdData,
          lastTimeFetched: Date.now(),
          errorCount: customOrderIdData.errorCount + 1,
        },
        null,
      ];
    } else if (updatedCustomOrderIdData.status === OrderStatusEnum.IdExpired) {
      /** In this case the order is expired and will be removed from the list */
      return [{ ...customOrderIdData, expired: true }, null];
    } else if (updatedCustomOrderIdData.status !== OrderStatusEnum.Precreated) {
      /** In this case the order is not error, expired or precreated, so it is an actual order */
      return [customOrderIdData, updatedCustomOrderIdData];
    }

    return [
      { ...customOrderIdData, lastTimeFetched: Date.now(), errorCount: 0 },
      null,
    ];
  } catch (error: any) {
    return [customOrderIdData, null];
  }
}
