import React from 'react';
import {
  DEFAULT_PRO_POSITION_SORT,
  PRO_POSITION_SORT_OPTIONS,
  type ProPositionSortConfig,
} from '../utils/proPositionSort';
import PerpsProSortSheet from './PerpsProSortSheet';

export interface PerpsProPositionsSortSheetProps {
  isVisible: boolean;
  sortConfig: ProPositionSortConfig;
  onApply: (next: ProPositionSortConfig) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Bottom sheet for sorting Pro positions by value, unrealized P&L, or funding.
 */
const PerpsProPositionsSortSheet = ({
  isVisible,
  sortConfig,
  onApply,
  onClose,
  testID = 'perps-pro-positions-sort-sheet',
}: PerpsProPositionsSortSheetProps) => (
  <PerpsProSortSheet
    isVisible={isVisible}
    sortConfig={sortConfig}
    options={PRO_POSITION_SORT_OPTIONS}
    onApply={onApply}
    onClose={onClose}
    onClear={() => onApply(DEFAULT_PRO_POSITION_SORT)}
    testID={testID}
  />
);

export default PerpsProPositionsSortSheet;
