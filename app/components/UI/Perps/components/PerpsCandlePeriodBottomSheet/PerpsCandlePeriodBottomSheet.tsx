import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { CANDLE_PERIODS } from '../../constants/chartConfig';

export interface PerpsCandlePeriodBottomSheetRef {
  show: () => void;
  hide: () => void;
}

interface PerpsCandlePeriodBottomSheetProps {
  isVisible: boolean;
  selectedPeriod: string;
  onPeriodChange?: (period: string) => void;
  testID?: string;
}

const PerpsCandlePeriodBottomSheet = forwardRef<
  PerpsCandlePeriodBottomSheetRef,
  PerpsCandlePeriodBottomSheetProps
>(({ isVisible, selectedPeriod, onPeriodChange, testID }, ref) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useImperativeHandle(ref, () => ({
    show: () => {
      bottomSheetRef.current?.onOpenBottomSheet();
    },
    hide: () => {
      bottomSheetRef.current?.onCloseBottomSheet();
    },
  }));

  const handlePeriodSelect = (period: string) => {
    onPeriodChange?.(period);
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      testID={testID}
    >
      <Box twClassName="px-6 py-4">
        {/* Header */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-6"
        >
          <Text variant={TextVariant.HeadingMd} twClassName="text-text-default">
            Select Candle Period
          </Text>
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'w-8 h-8 rounded-full justify-center items-center',
                pressed && 'bg-background-pressed',
              )
            }
            onPress={() => bottomSheetRef.current?.onCloseBottomSheet()}
            testID={`${testID}-close-button`}
          >
            <Icon
              name={IconName.Close}
              size={IconSize.Md}
              twClassName="text-icon-default"
            />
          </Pressable>
        </Box>

        {/* Period Options */}
        <Box>
          {CANDLE_PERIODS.map((period, index) => (
            <Pressable
              key={period.value}
              style={({ pressed }) =>
                tw.style(
                  'flex-row items-center justify-between py-4 px-4 rounded-lg',
                  index < CANDLE_PERIODS.length - 1 && 'mb-2',
                  selectedPeriod === period.value
                    ? 'bg-primary-muted border-2 border-primary-default'
                    : 'bg-background-default border border-border-muted',
                  pressed && 'opacity-70',
                )
              }
              onPress={() => handlePeriodSelect(period.value)}
              testID={`${testID}-period-${period.value}`}
            >
              <Text
                variant={TextVariant.BodyMd}
                twClassName={
                  selectedPeriod === period.value
                    ? 'text-primary-default font-medium'
                    : 'text-text-default'
                }
              >
                {period.label}
              </Text>
              {selectedPeriod === period.value && (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  twClassName="text-primary-default"
                />
              )}
            </Pressable>
          ))}
        </Box>

        {/* Bottom Padding for Safe Area */}
        <Box twClassName="h-6" />
      </Box>
    </BottomSheet>
  );
});

PerpsCandlePeriodBottomSheet.displayName = 'PerpsCandlePeriodBottomSheet';

export default PerpsCandlePeriodBottomSheet;
