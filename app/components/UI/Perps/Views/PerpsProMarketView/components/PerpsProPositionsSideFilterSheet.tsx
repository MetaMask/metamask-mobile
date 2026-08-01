import { ListItemSelect } from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import PerpsProPositionsOptionSheet from './PerpsProPositionsOptionSheet';
import ProPositionSideFilterIcon from './ProPositionSideFilterIcon';
import {
  PRO_POSITION_SIDE_FILTER_OPTIONS,
  type ProPositionSideFilter,
} from '../utils/proPositionSideFilter';

export interface PerpsProPositionsSideFilterSheetProps {
  isVisible: boolean;
  sideFilter: ProPositionSideFilter;
  onApply: (next: ProPositionSideFilter) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Bottom sheet for filtering Pro positions by all sides, long, or short.
 */
const PerpsProPositionsSideFilterSheet = ({
  isVisible,
  sideFilter,
  onApply,
  onClose,
  testID = 'perps-pro-positions-side-filter-sheet',
}: PerpsProPositionsSideFilterSheetProps) => {
  const [draftSideFilter, setDraftSideFilter] =
    useState<ProPositionSideFilter>(sideFilter);

  const resetDraft = useCallback(() => {
    setDraftSideFilter(sideFilter);
  }, [sideFilter]);

  const handleApply = useCallback(() => {
    onApply(draftSideFilter);
  }, [draftSideFilter, onApply]);

  return (
    <PerpsProPositionsOptionSheet
      isVisible={isVisible}
      title={strings('perps.market_type.filter_by')}
      onClose={onClose}
      onApply={handleApply}
      onOpen={resetDraft}
      testID={testID}
    >
      {PRO_POSITION_SIDE_FILTER_OPTIONS.map((option) => {
        const isSelected = draftSideFilter === option.id;

        return (
          <ListItemSelect
            key={option.id}
            title={strings(option.labelKey)}
            isSelected={isSelected}
            showSelectedIcon
            startAccessory={
              <ProPositionSideFilterIcon sideFilter={option.id} />
            }
            onPress={() => setDraftSideFilter(option.id)}
            testID={`${testID}-option-${option.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          />
        );
      })}
    </PerpsProPositionsOptionSheet>
  );
};

export default PerpsProPositionsSideFilterSheet;
