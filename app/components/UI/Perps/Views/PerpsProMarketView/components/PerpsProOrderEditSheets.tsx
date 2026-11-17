import type { Order } from '@metamask/perps-controller';
import React from 'react';
import PerpsLimitPriceBottomSheet from '../../../components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet';
import PerpsOrderSizeBottomSheet from '../../../components/PerpsOrderSizeBottomSheet/PerpsOrderSizeBottomSheet';
import { isClosingOrder } from '../../../utils/orderDirection';
import {
  getOrderEditableLimitPrice,
  getOrderEditableSize,
  type OrderEditField,
} from '../../../utils/orderEditUtils';
import { getOrderPositionDirection } from '../../../utils/orderUtils';
import PerpsProModalPortal from './PerpsProModalPortal';

interface PerpsProOrderEditSheetsProps {
  editingOrder: Order | null;
  editingOrderSheet: OrderEditField | null;
  editingOrderSzDecimals: number;
  editingOrderLeverage: number;
  isEditingOrderMarketDataReady: boolean;
  onClose: () => void;
  onConfirmPrice: (limitPrice: string) => void;
  onConfirmSize: (size: string) => void;
}

/**
 * Shared Pro order edit sheets (limit price and size) rendered in a portal.
 */
const PerpsProOrderEditSheets = ({
  editingOrder,
  editingOrderSheet,
  editingOrderSzDecimals,
  editingOrderLeverage,
  isEditingOrderMarketDataReady,
  onClose,
  onConfirmPrice,
  onConfirmSize,
}: PerpsProOrderEditSheetsProps) => {
  if (!editingOrder || !editingOrderSheet) {
    return null;
  }

  if (editingOrderSheet === 'price') {
    return (
      <PerpsProModalPortal onRequestClose={onClose}>
        <PerpsLimitPriceBottomSheet
          isVisible
          asset={editingOrder.symbol}
          limitPrice={getOrderEditableLimitPrice(editingOrder)}
          direction={getOrderPositionDirection(editingOrder)}
          isClosingPosition={isClosingOrder(editingOrder)}
          restingOrderSize={getOrderEditableSize(editingOrder)}
          leverage={editingOrderLeverage}
          reduceOnly={editingOrder.reduceOnly}
          isMarketDataReady={isEditingOrderMarketDataReady}
          onClose={onClose}
          onConfirm={onConfirmPrice}
        />
      </PerpsProModalPortal>
    );
  }

  return (
    <PerpsProModalPortal onRequestClose={onClose}>
      <PerpsOrderSizeBottomSheet
        isVisible
        asset={editingOrder.symbol}
        orderSize={getOrderEditableSize(editingOrder)}
        limitPrice={getOrderEditableLimitPrice(editingOrder)}
        szDecimals={editingOrderSzDecimals}
        leverage={editingOrderLeverage}
        reduceOnly={editingOrder.reduceOnly}
        isMarketDataReady={isEditingOrderMarketDataReady}
        onClose={onClose}
        onConfirm={onConfirmSize}
      />
    </PerpsProModalPortal>
  );
};

export default React.memo(PerpsProOrderEditSheets);
