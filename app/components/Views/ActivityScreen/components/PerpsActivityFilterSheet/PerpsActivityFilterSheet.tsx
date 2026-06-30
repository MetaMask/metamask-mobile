import React, { useCallback, useRef } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_ACTIVITY_FILTER_ORDER, PerpsActivityFilter } from '../../types';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';

export const PERPS_ACTIVITY_FILTER_LABEL_KEY: Record<
  PerpsActivityFilter,
  string
> = {
  [PerpsActivityFilter.Trades]: 'activity_view.perps_filter.trades',
  [PerpsActivityFilter.Order]: 'activity_view.perps_filter.order',
  [PerpsActivityFilter.Fundings]: 'activity_view.perps_filter.fundings',
  [PerpsActivityFilter.Deposits]: 'activity_view.perps_filter.deposits',
};

export interface PerpsActivityFilterSheetProps {
  selected: PerpsActivityFilter;
  onSelect: (filter: PerpsActivityFilter) => void;
  onClose: () => void;
}

const PerpsActivityFilterSheet: React.FC<PerpsActivityFilterSheetProps> = ({
  selected,
  onSelect,
  onClose,
}) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleSelect = useCallback(
    (filter: PerpsActivityFilter) => {
      onSelect(filter);
      sheetRef.current?.onCloseBottomSheet(onClose);
    },
    [onSelect, onClose],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID={ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET}
    >
      <BottomSheetHeader>
        {strings('activity_view.perps_filter.title')}
      </BottomSheetHeader>

      <Box twClassName="pb-4">
        {PERPS_ACTIVITY_FILTER_ORDER.map((filter) => {
          const isSelected = filter === selected;
          return (
            <Pressable
              key={filter}
              onPress={() => handleSelect(filter)}
              style={tw.style(
                'flex-row items-center justify-between px-4 py-4',
                isSelected && 'bg-muted',
              )}
              testID={`${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${filter}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text variant={TextVariant.BodyMd}>
                {strings(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter])}
              </Text>
              {isSelected ? (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                />
              ) : null}
            </Pressable>
          );
        })}
      </Box>
    </BottomSheet>
  );
};

export default PerpsActivityFilterSheet;
