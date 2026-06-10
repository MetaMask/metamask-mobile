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
import { ACTIVITY_TYPE_FILTER_ORDER, ActivityTypeFilter } from '../../types';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';

export const ACTIVITY_TYPE_FILTER_LABEL_KEY: Record<
  ActivityTypeFilter,
  string
> = {
  // `All` is not currently selectable from the sheet — see the TODO above
  // `ACTIVITY_TYPE_FILTER_ORDER` in ../../types.ts. Kept for type completeness
  // and so chip labels keep resolving if the flag is re-enabled.
  [ActivityTypeFilter.All]: 'activity_view.type_filter.all',
  [ActivityTypeFilter.Transactions]: 'activity_view.type_filter.transactions',
  [ActivityTypeFilter.BuySell]: 'activity_view.type_filter.buy_sell',
  [ActivityTypeFilter.Perps]: 'activity_view.type_filter.perps',
  [ActivityTypeFilter.Predictions]: 'activity_view.type_filter.predictions',
  [ActivityTypeFilter.MetamaskCard]: 'activity_view.type_filter.metamask_card',
  [ActivityTypeFilter.Money]: 'activity_view.type_filter.money',
};

export interface ActivityTypeFilterSheetProps {
  selected: ActivityTypeFilter;
  onSelect: (filter: ActivityTypeFilter) => void;
  onClose: () => void;
}

const ActivityTypeFilterSheet: React.FC<ActivityTypeFilterSheetProps> = ({
  selected,
  onSelect,
  onClose,
}) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleSelect = useCallback(
    (filter: ActivityTypeFilter) => {
      onSelect(filter);
      sheetRef.current?.onCloseBottomSheet(onClose);
    },
    [onSelect, onClose],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID={ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET}
    >
      <BottomSheetHeader>
        {strings('activity_view.type_filter.title')}
      </BottomSheetHeader>

      <Box twClassName="pb-4">
        {ACTIVITY_TYPE_FILTER_ORDER.map((filter) => {
          const isSelected = filter === selected;
          return (
            <Pressable
              key={filter}
              onPress={() => handleSelect(filter)}
              style={tw.style(
                'flex-row items-center justify-between px-4 py-4',
                isSelected && 'bg-muted',
              )}
              testID={`${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text variant={TextVariant.BodyMd}>
                {strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter])}
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

export default ActivityTypeFilterSheet;
