import {
  DECIMAL_PRECISION_CONFIG,
  PERPS_CONSTANTS,
  PERPS_EVENT_VALUE,
  selectTradeConfiguration,
  type Order,
} from '@metamask/perps-controller';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import PerpsProOrderEditSheets from '../Views/PerpsProMarketView/components/PerpsProOrderEditSheets';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import {
  buildOrderEditParams,
  buildOrderOptimisticEdit,
  getOrderEditConfirmedSize,
  getOrderEditPreviousValue,
  hasOrderEditValueChanged,
  type OrderEditField,
} from '../utils/orderEditUtils';
import {
  getOrderPositionDirection,
  isLimitOrderEditable,
  isLimitOrderSizeEditable,
} from '../utils/orderUtils';
import { usePerpsLivePositions } from './stream';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsSelector } from './usePerpsSelector';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts from './usePerpsToasts';

const PRO_MARKET_SOURCE = PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN;

export interface UsePerpsProOrderEditParams {
  isMutationBlocked: boolean;
  runGatedEligibleAction: (
    source: string,
    action: () => void | Promise<void>,
  ) => void;
}

export interface UsePerpsProOrderEditReturn {
  editingOrderId: string | null;
  isOrderEditable: (order: Order) => boolean;
  isOrderSizeEditable: (order: Order) => boolean;
  handleEditOrderPrice: (order: Order) => void;
  handleEditOrderSize: (order: Order) => void;
  renderOrderEditSheets: () => React.ReactNode;
}

const isFieldEditable = (order: Order, field: OrderEditField): boolean =>
  field === 'price'
    ? isLimitOrderEditable(order)
    : isLimitOrderSizeEditable(order);

/**
 * Shared Pro open-order edit flow for limit price and size.
 */
export const usePerpsProOrderEdit = ({
  isMutationBlocked,
  runGatedEligibleAction,
}: UsePerpsProOrderEditParams): UsePerpsProOrderEditReturn => {
  const { editOrder } = usePerpsTrading();
  const stream = usePerpsStream();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingOrderSheet, setEditingOrderSheet] =
    useState<OrderEditField | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  // React state updates are batched/async, so a fast double-tap on confirm can
  // re-enter handleConfirmEdit before editingOrderId reflects the first call.
  // This ref is set synchronously to block that race regardless of render timing.
  const isSubmittingEditRef = useRef(false);

  const {
    marketData: editingOrderMarketData,
    isLoading: isEditingOrderMarketDataLoading,
  } = usePerpsMarketData(editingOrder?.symbol ?? '');
  const isEditingOrderMarketDataReady =
    Boolean(editingOrderMarketData) && !isEditingOrderMarketDataLoading;
  // Only expose real market precision/leverage once loaded — fallbacks are
  // more permissive (decimals) or stricter (leverage) than most markets and
  // must not drive keypad/confirm while loading.
  const editingOrderSzDecimals = isEditingOrderMarketDataReady
    ? (editingOrderMarketData?.szDecimals ??
      DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals)
    : DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;
  const editingOrderMaxLeverage = isEditingOrderMarketDataReady
    ? (editingOrderMarketData?.maxLeverage ??
      PERPS_CONSTANTS.DefaultMaxLeverage)
    : PERPS_CONSTANTS.DefaultMaxLeverage;

  // Prefer position leverage, then saved trade-config leverage, then market max.
  // Max alone understates required margin when the user trades below the cap.
  const { positions } = usePerpsLivePositions({ throttleMs: 1000 });
  const savedTradeConfig = usePerpsSelector((state) =>
    selectTradeConfiguration(state, editingOrder?.symbol ?? ''),
  );
  const editingOrderLeverage = useMemo(() => {
    const symbol = editingOrder?.symbol;
    if (!symbol) {
      return editingOrderMaxLeverage;
    }
    const positionLeverage = positions.find((p) => p.symbol === symbol)
      ?.leverage?.value;
    if (typeof positionLeverage === 'number' && positionLeverage > 0) {
      return positionLeverage;
    }
    const configLeverage = savedTradeConfig?.leverage;
    if (typeof configLeverage === 'number' && configLeverage > 0) {
      return configLeverage;
    }
    return editingOrderMaxLeverage;
  }, [
    editingOrder?.symbol,
    editingOrderMaxLeverage,
    positions,
    savedTradeConfig?.leverage,
  ]);

  const isOrderEditable = useCallback(
    (order: Order) => isLimitOrderEditable(order),
    [],
  );

  const isOrderSizeEditable = useCallback(
    (order: Order) => isLimitOrderSizeEditable(order),
    [],
  );

  const closeEditSheet = useCallback(() => {
    setEditingOrder(null);
    setEditingOrderSheet(null);
  }, []);

  const openEditSheet = useCallback(
    (order: Order, field: OrderEditField) => {
      if (
        !isFieldEditable(order, field) ||
        isMutationBlocked ||
        editingOrderId
      ) {
        return;
      }

      runGatedEligibleAction(
        PERPS_EVENT_VALUE.SOURCE.MODIFY_POSITION_ACTION,
        () => {
          setEditingOrder(order);
          setEditingOrderSheet(field);
        },
      );
    },
    [editingOrderId, isMutationBlocked, runGatedEligibleAction],
  );

  const handleEditOrderPrice = useCallback(
    (order: Order) => openEditSheet(order, 'price'),
    [openEditSheet],
  );

  const handleEditOrderSize = useCallback(
    (order: Order) => openEditSheet(order, 'size'),
    [openEditSheet],
  );

  const handleConfirmEdit = useCallback(
    async (field: OrderEditField, newValue: string) => {
      if (isSubmittingEditRef.current) {
        return;
      }

      if (!editingOrder) {
        return;
      }

      // Cancel (or another mutation) in flight — do not race editOrder against it.
      if (isMutationBlocked || editingOrderId) {
        closeEditSheet();
        return;
      }

      // Re-read live order state at confirm — the sheet seed is a snapshot from
      // open time and can miss partial fills / cancels that arrived while open.
      const snapshot = stream.orders.getSnapshot?.() ?? null;
      const liveOrder = snapshot?.find(
        (cachedOrder) => cachedOrder.orderId === editingOrder.orderId,
      );

      // Snapshot loaded and order absent → cancelled/filled while sheet was open.
      if (snapshot !== null && !liveOrder) {
        closeEditSheet();
        return;
      }

      const orderToEdit = liveOrder ?? editingOrder;
      if (!isFieldEditable(orderToEdit, field)) {
        closeEditSheet();
        return;
      }

      if (!hasOrderEditValueChanged(orderToEdit, field, newValue)) {
        closeEditSheet();
        return;
      }

      const orderDirection = getOrderPositionDirection(orderToEdit);
      const previousValue = getOrderEditPreviousValue(orderToEdit, field);
      const optimisticEdit = buildOrderOptimisticEdit(field, newValue);

      isSubmittingEditRef.current = true;
      closeEditSheet();
      setEditingOrderId(orderToEdit.orderId);
      stream.orders.updateOrderOptimistic(orderToEdit.orderId, optimisticEdit);
      showToast(PerpsToastOptions.orderManagement.limit.editSubmitting());

      try {
        const result = await editOrder({
          orderId: orderToEdit.orderId,
          newOrder: buildOrderEditParams(
            orderToEdit,
            field,
            newValue,
            editingOrderLeverage,
            {
              totalFee: 0,
              marketPrice: 0,
              source: PRO_MARKET_SOURCE,
            },
          ),
          // Size-only edits still send price (venue needs it) but the price
          // does not change — skip the ORDER_PRICE_UPDATED watcher so CUF
          // does not end on an unrelated orders refresh.
          watchPriceUpdate: field === 'price',
        });

        if (result.success) {
          showToast(
            PerpsToastOptions.orderManagement.limit.editConfirmed(
              orderDirection,
              getOrderEditConfirmedSize(orderToEdit, field, newValue),
              orderToEdit.symbol,
            ),
          );
        } else {
          if (previousValue) {
            stream.orders.updateOrderOptimistic(
              orderToEdit.orderId,
              buildOrderOptimisticEdit(field, previousValue),
            );
          }
          showToast(
            PerpsToastOptions.orderManagement.limit.editFailed(result.error),
          );
        }
      } catch {
        if (previousValue) {
          stream.orders.updateOrderOptimistic(
            orderToEdit.orderId,
            buildOrderOptimisticEdit(field, previousValue),
          );
        }
        showToast(PerpsToastOptions.orderManagement.limit.editFailed());
      } finally {
        setEditingOrderId(null);
        isSubmittingEditRef.current = false;
      }
    },
    [
      closeEditSheet,
      editOrder,
      editingOrder,
      editingOrderId,
      isMutationBlocked,
      PerpsToastOptions,
      showToast,
      stream,
    ],
  );

  const handleConfirmEditPrice = useCallback(
    (newLimitPrice: string) => handleConfirmEdit('price', newLimitPrice),
    [handleConfirmEdit],
  );

  const handleConfirmEditSize = useCallback(
    (newSize: string) => handleConfirmEdit('size', newSize),
    [handleConfirmEdit],
  );

  const renderOrderEditSheets = useCallback(
    () => (
      <PerpsProOrderEditSheets
        editingOrder={editingOrder}
        editingOrderSheet={editingOrderSheet}
        editingOrderSzDecimals={editingOrderSzDecimals}
        editingOrderLeverage={editingOrderLeverage}
        isEditingOrderMarketDataReady={isEditingOrderMarketDataReady}
        onClose={closeEditSheet}
        onConfirmPrice={handleConfirmEditPrice}
        onConfirmSize={handleConfirmEditSize}
      />
    ),
    [
      closeEditSheet,
      editingOrder,
      editingOrderSheet,
      editingOrderSzDecimals,
      editingOrderLeverage,
      handleConfirmEditPrice,
      handleConfirmEditSize,
      isEditingOrderMarketDataReady,
    ],
  );

  return {
    editingOrderId,
    isOrderEditable,
    isOrderSizeEditable,
    handleEditOrderPrice,
    handleEditOrderSize,
    renderOrderEditSheets,
  };
};
