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
import { useHaptics } from '../../../../../../util/haptics';
import type { ProSortDirection } from '../utils/proSortCompare';
import PerpsProPositionsOptionSheet from './PerpsProPositionsOptionSheet';

export interface ProSortConfig<TField extends string> {
  field: TField;
  direction: ProSortDirection;
}

export interface ProSortOption<TField extends string> {
  id: TField;
  labelKey: string;
}

export interface PerpsProSortSheetProps<TField extends string> {
  isVisible: boolean;
  sortConfig: ProSortConfig<TField>;
  options: readonly ProSortOption<TField>[];
  onApply: (next: ProSortConfig<TField>) => void;
  onClose: () => void;
  onClear?: () => void;
  testID?: string;
}

/**
 * Shared bottom sheet for Pro positions/orders sorting.
 * Tapping the active option toggles high-to-low / low-to-high before Apply.
 */
const PerpsProSortSheet = <TField extends string>({
  isVisible,
  sortConfig,
  options,
  onApply,
  onClose,
  onClear,
  testID = 'perps-pro-sort-sheet',
}: PerpsProSortSheetProps<TField>) => {
  const { playSelection } = useHaptics();
  const [draftField, setDraftField] = useState<TField>(sortConfig.field);
  const [draftDirection, setDraftDirection] = useState<ProSortDirection>(
    sortConfig.direction,
  );

  const resetDraft = useCallback(() => {
    setDraftField(sortConfig.field);
    setDraftDirection(sortConfig.direction);
  }, [sortConfig.direction, sortConfig.field]);

  const handleOptionPress = useCallback(
    (field: TField) => {
      playSelection().catch(() => undefined);
      if (draftField === field) {
        setDraftDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        return;
      }

      setDraftField(field);
      setDraftDirection('desc');
    },
    [draftField, playSelection],
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
      onClear={onClear}
      onOpen={resetDraft}
      testID={testID}
    >
      {options.map((option) => {
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
                <Box
                  twClassName="flex-row items-center gap-2"
                  accessible={false}
                >
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

export default PerpsProSortSheet;
