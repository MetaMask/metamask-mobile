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
import {
  PRO_ORDER_SORT_OPTIONS,
  type ProOrderSortConfig,
  type ProOrderSortDirection,
  type ProOrderSortField,
} from '../utils/proOrderSort';
import PerpsProPositionsOptionSheet from './PerpsProPositionsOptionSheet';

interface PerpsProOrdersSortSheetProps {
  isVisible: boolean;
  sortConfig: ProOrderSortConfig;
  onApply: (next: ProOrderSortConfig) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Bottom sheet for sorting Pro orders by value, size, price, or creation time.
 * Tapping the active option toggles high-to-low / low-to-high before Apply.
 */
const PerpsProOrdersSortSheet = ({
  isVisible,
  sortConfig,
  onApply,
  onClose,
  testID = 'perps-pro-orders-sort-sheet',
}: PerpsProOrdersSortSheetProps) => {
  const [draftField, setDraftField] = useState<ProOrderSortField>(
    sortConfig.field,
  );
  const [draftDirection, setDraftDirection] = useState<ProOrderSortDirection>(
    sortConfig.direction,
  );

  const resetDraft = useCallback(() => {
    setDraftField(sortConfig.field);
    setDraftDirection(sortConfig.direction);
  }, [sortConfig.direction, sortConfig.field]);

  const handleOptionPress = useCallback(
    (field: ProOrderSortField) => {
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
      {PRO_ORDER_SORT_OPTIONS.map((option) => {
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

export default PerpsProOrdersSortSheet;
