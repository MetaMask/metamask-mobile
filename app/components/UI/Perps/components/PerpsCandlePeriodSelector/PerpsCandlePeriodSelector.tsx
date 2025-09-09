import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CandlePeriod } from '../../constants/chartConfig';
import { getPerpsCandlePeriodSelector } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Icon, { IconColor, IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';

// Default candle periods with preset values
const DEFAULT_CANDLE_PERIODS = [
  { label: '1min', value: CandlePeriod.ONE_MINUTE },
  { label: '3min', value: CandlePeriod.THREE_MINUTES },
  { label: '5min', value: CandlePeriod.FIVE_MINUTES },
  { label: '15min', value: CandlePeriod.FIFTEEN_MINUTES },
] as const;

interface PerpsCandlePeriodSelectorProps {
  selectedPeriod: CandlePeriod | string;
  onPeriodChange?: (period: CandlePeriod) => void;
  onMorePress?: () => void;
  testID?: string;
}

const PerpsCandlePeriodSelector: React.FC<PerpsCandlePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  onMorePress,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="w-full py-3 px-4 gap-1"
      testID={testID}
    >
      {/* Candle Period Buttons */}
      {DEFAULT_CANDLE_PERIODS.map((period) => {
        const isSelected =
          selectedPeriod.toLowerCase() === period.value.toLowerCase();

        return (
          <Pressable
            key={period.value}
            style={({ pressed }) =>
              tw.style(
                'px-3 py-1.5 rounded-lg mx-0.5 items-center justify-center',
                isSelected && 'bg-background-muted',
                !isSelected && 'bg-background-default',
                pressed && 'opacity-70',
              )
            }
            onPress={() => onPeriodChange?.(period.value)}
            testID={
              testID
                ? getPerpsCandlePeriodSelector.periodButton(
                    testID,
                    period.value,
                  )
                : undefined
            }
          >
            <Text
              variant={TextVariant.BodySm}
              twClassName={isSelected ? 'text-text-default' : 'text-text-alternative'}
            >
              {period.label}
            </Text>
          </Pressable>
        );
      })}

      {/* More Button */}
      <Pressable
        style={({ pressed }) =>
          tw.style(
            'px-3 py-1.5 rounded-lg mx-0.5 items-center justify-center bg-background-default flex-row',
            pressed && 'opacity-70',
          )
        }
        onPress={onMorePress}
        testID={
          testID ? getPerpsCandlePeriodSelector.moreButton(testID) : undefined
        }
      >
        <Text variant={TextVariant.BodySm} twClassName="text-text-alternative mr-1">
          {strings('perps.chart.candle_period_selector.show_more')}
        </Text>
        <Icon name={IconName.ArrowDown} size={IconSize.Xs}  color={IconColor.Alternative}  />
      </Pressable>
    </Box>
  );
};

export default PerpsCandlePeriodSelector;
