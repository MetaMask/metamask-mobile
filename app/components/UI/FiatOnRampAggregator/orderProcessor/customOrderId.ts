import { CustomIdData } from '../../../../reducers/fiatOrders/types';
import { SDK } from '../sdk';

export const SECOND = 60 * 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
export const INITIAL_DELAY = 10 * SECOND;
export const EXPIRATION_TIME = HOUR;

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

    /* TODO: add 'CUSTOM_ID_REGISTERED' to OrderStatusEnum */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore CUSTOM_ID_REGISTERED is not in OrderStatusEnum
    if (updatedCustomOrderIdData.status !== 'CUSTOM_ID_REGISTERED') {
      return [customOrderIdData, updatedCustomOrderIdData];
    }

    return [
      { ...customOrderIdData, lastTimeFetched: Date.now(), errorCount: 0 },
      null,
    ];
  } catch (error: any) {
    if (!error?.response?.status) {
      return [customOrderIdData, null];
    }

    if (error.response.status >= 400 && error.response.status < 500) {
      if (customOrderIdData.lastTimeFetched + EXPIRATION_TIME >= now) {
        return [{ ...customOrderIdData, expired: true }, null];
      }
      return [{ ...customOrderIdData, lastTimeFetched: Date.now() }, null];
    } else if (error.response.status >= 500) {
      return [
        {
          ...customOrderIdData,
          lastTimeFetched: Date.now(),
          errorCount: customOrderIdData.errorCount + 1,
        },
        null,
      ];
    }
  }
}
