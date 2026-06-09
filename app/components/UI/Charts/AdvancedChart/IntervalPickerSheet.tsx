import React, { useCallback, useRef } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

export const INTERVALS = ['1M', '5M', '15M', '1H', '4H', '1D'] as const;

export interface IntervalPickerSheetParams {
  selectedInterval: string;
  onSelect?: (interval: string) => void;
}

export const createIntervalPickerNavDetails =
  createNavigationDetails<IntervalPickerSheetParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.INTERVAL_PICKER,
  );

const IntervalPickerSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const tw = useTailwind();
  const { selectedInterval, onSelect } = useParams<IntervalPickerSheetParams>();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSelect = useCallback(
    (interval: string) => {
      onSelect?.(interval);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('asset_overview.interval_picker_title')}
      </BottomSheetHeader>
      <Box>
        {INTERVALS.map((interval) => {
          const isSelected = interval === selectedInterval;
          return (
            <Pressable
              key={interval}
              style={({ pressed }) =>
                tw.style('px-4 py-4', pressed && 'opacity-70')
              }
              onPress={() => handleSelect(interval)}
              accessibilityRole="button"
              accessibilityLabel={interval}
              accessibilityState={{ selected: isSelected }}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={isSelected ? FontWeight.Bold : FontWeight.Regular}
                  twClassName={
                    isSelected ? 'text-text-default' : 'text-text-alternative'
                  }
                >
                  {interval}
                </Text>
                {isSelected && (
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Md}
                    twClassName="text-text-default"
                  />
                )}
              </Box>
            </Pressable>
          );
        })}
      </Box>
    </BottomSheet>
  );
};

export default IntervalPickerSheet;
