import { OrderStatusEnum } from '@consensys/on-ramp-sdk';
import { CustomIdData } from '../../../../reducers/fiatOrders/types';
import { SDK } from '../sdk';

export const SECOND = 60 * 1000;
export const INITIAL_DELAY = 10 * SECOND;

export default async function processCustomOrderIdData(
  customOrderIdData: CustomIdData,
) {
  const now = Date.now();

  /**
   * If the custom order id has been added in less than 10 seconds, we don't fetch it
   */
  if (customOrderIdData.createdAt + INITIAL_DELAY > now) {
    return [customOrderIdData, null];
  }

  /**
   * If the custom order had errors, we don't fetch it unless
   * INITIAL_DELAY ^ errorCount + 1 has passed
   */
  if (
    customOrderIdData.errorCount > 0 &&
    customOrderIdData.lastTimeFetched +
      Math.pow(INITIAL_DELAY / SECOND, customOrderIdData.errorCount + 1) *
        SECOND >
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
      /** This represents an error, we update the error count and the last time fetched */
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
