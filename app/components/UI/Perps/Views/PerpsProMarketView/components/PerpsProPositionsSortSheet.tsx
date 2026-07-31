import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import PerpsProPositionsOptionSheet from './PerpsProPositionsOptionSheet';
import {
  PRO_POSITION_SORT_OPTIONS,
  type ProPositionSortConfig,
  type ProPositionSortDirection,
  type ProPositionSortField,
} from '../utils/proPositionSort';

export interface PerpsProPositionsSortSheetProps {
  isVisible: boolean;
  sortConfig: ProPositionSortConfig;
  onApply: (next: ProPositionSortConfig) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Bottom sheet for sorting Pro positions by value, unrealized P&L, or funding.
 * Tapping the active option toggles high-to-low / low-to-high before Apply.
 */
const PerpsProPositionsSortSheet = ({
  isVisible,
  sortConfig,
  onApply,
  onClose,
  testID = 'perps-pro-positions-sort-sheet',
}: PerpsProPositionsSortSheetProps) => {
  const [draftField, setDraftField] = useState<ProPositionSortField>(
    sortConfig.field,
  );
  const [draftDirection, setDraftDirection] =
    useState<ProPositionSortDirection>(sortConfig.direction);

  const resetDraft = useCallback(() => {
    setDraftField(sortConfig.field);
    setDraftDirection(sortConfig.direction);
  }, [sortConfig.direction, sortConfig.field]);

  const handleOptionPress = useCallback(
    (field: ProPositionSortField) => {
      if (draftField === field) {
        setDraftDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        return;
      }

      setDraftField(field);
      setDraftDirection('desc');
    },
    [draftField],
  );

  const handleApply = useCallback(() => {
    onApply({ field: draftField, direction: draftDirection });
  }, [draftDirection, draftField, onApply]);

  return (
    <PerpsProPositionsOptionSheet
      isVisible={isVisible}
      title={strings('perps.sort.sort_by')}
      onClose={onClose}
      onApply={handleApply}
      onOpen={resetDraft}
      testID={testID}
    >
      {PRO_POSITION_SORT_OPTIONS.map((option) => {
        const isSelected = draftField === option.id;

        return (
          <ListItemSelect
            key={option.id}
            title={strings(option.labelKey)}
            variant={ListItemVariant.OneLine}
            isSelected={isSelected}
            showSelectedIcon={false}
            onPress={() => handleOptionPress(option.id)}
            endAccessory={
              isSelected ? (
                <Box twClassName="flex-row items-center gap-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    testID={`${testID}-direction-text-${option.id}`}
                  >
                    {draftDirection === 'asc'
                      ? strings('perps.sort.low_to_high')
                      : strings('perps.sort.high_to_low')}
                  </Text>
                  <Icon
                    name={
                      draftDirection === 'asc'
                        ? IconName.Arrow2Up
                        : IconName.Arrow2Down
                    }
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                    testID={`${testID}-direction-indicator-${option.id}`}
                  />
                </Box>
              ) : undefined
            }
            testID={`${testID}-option-${option.id}`}
          />
        );
      })}
    </PerpsProPositionsOptionSheet>
  );
};

export default PerpsProPositionsSortSheet;
