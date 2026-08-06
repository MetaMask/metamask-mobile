import React from 'react';
import {
  PRO_ORDER_SORT_OPTIONS,
  type ProOrderSortConfig,
} from '../utils/proOrderSort';
import PerpsProSortSheet from './PerpsProSortSheet';

interface PerpsProOrdersSortSheetProps {
  isVisible: boolean;
  sortConfig: ProOrderSortConfig;
  onApply: (next: ProOrderSortConfig) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Bottom sheet for sorting Pro orders by value, size, price, or creation time.
 */
const PerpsProOrdersSortSheet = ({
  isVisible,
  sortConfig,
  onApply,
  onClose,
  testID = 'perps-pro-orders-sort-sheet',
}: PerpsProOrdersSortSheetProps) => (
  <PerpsProSortSheet
    isVisible={isVisible}
    sortConfig={sortConfig}
    options={PRO_ORDER_SORT_OPTIONS}
    onApply={onApply}
    onClose={onClose}
    testID={testID}
  />
);

export default PerpsProOrdersSortSheet;
