import type { Order, OrderParams } from '@metamask/perps-controller';
import { buildEditOrderParamsFromOrder } from './orderParams';
import { getValidOrderPrice } from './orderUtils';

export type OrderEditField = 'price' | 'size';

type OrderTrackingData = OrderParams['trackingData'];

export interface OrderOptimisticEdit {
  limitPrice?: string;
  size?: string;
}

/** Resting limit price for an editable open order. */
export const getOrderEditableLimitPrice = (order: Order): string =>
  getValidOrderPrice(order)?.toString() ?? order.price ?? '';

/** Remaining token size for an editable open order. */
export const getOrderEditableSize = (order: Order): string =>
  order.remainingSize ?? order.originalSize ?? order.size;

/** Whether the submitted value differs from the order's current field value. */
export const hasOrderEditValueChanged = (
  order: Order,
  field: OrderEditField,
  newValue: string,
): boolean => {
  if (field === 'price') {
    const currentPrice = getValidOrderPrice(order);
    const parsedNewPrice = Number.parseFloat(newValue);
    return !(
      currentPrice !== null &&
      Number.isFinite(parsedNewPrice) &&
      currentPrice === parsedNewPrice
    );
  }

  const currentSize = getOrderEditableSize(order);
  const parsedNewSize = Number.parseFloat(newValue);
  const parsedCurrentSize = Number.parseFloat(currentSize);
  return !(
    Number.isFinite(parsedNewSize) &&
    Number.isFinite(parsedCurrentSize) &&
    parsedNewSize === parsedCurrentSize
  );
};

/** Previous value to restore after a failed optimistic edit. */
export const getOrderEditPreviousValue = (
  order: Order,
  field: OrderEditField,
): string | undefined => {
  if (field === 'price') {
    // Prefer validated price so rollback matches change-detection input.
    return getValidOrderPrice(order)?.toString() ?? order.price;
  }

  return getOrderEditableSize(order);
};

/** Market price used in edit-order tracking for the given field update. */
export const getOrderEditMarketPrice = (
  order: Order,
  field: OrderEditField,
  newValue: string,
): number => {
  if (field === 'price') {
    const parsedNewPrice = Number.parseFloat(newValue);
    const currentPrice = getValidOrderPrice(order);
    return Number.isFinite(parsedNewPrice) && parsedNewPrice > 0
      ? parsedNewPrice
      : (currentPrice ?? 0);
  }

  const parsedLimitPrice = Number.parseFloat(getOrderEditableLimitPrice(order));
  return Number.isFinite(parsedLimitPrice) && parsedLimitPrice > 0
    ? parsedLimitPrice
    : 0;
};

/** Size string included in the post-edit success toast. */
export const getOrderEditConfirmedSize = (
  order: Order,
  field: OrderEditField,
  newValue: string,
): string => (field === 'size' ? newValue : order.size);

/** Builds the optimistic cache patch for a single-field order edit. */
export const buildOrderOptimisticEdit = (
  field: OrderEditField,
  newValue: string,
): OrderOptimisticEdit =>
  field === 'price' ? { limitPrice: newValue } : { size: newValue };

/** Builds controller params for a single-field order edit. */
export const buildOrderEditParams = (
  order: Order,
  field: OrderEditField,
  newValue: string,
  leverage: number,
  trackingData: OrderTrackingData,
): OrderParams =>
  buildEditOrderParamsFromOrder({
    order,
    leverage,
    ...(field === 'price'
      ? { newLimitPrice: newValue }
      : { newSize: newValue }),
    trackingData,
  });
