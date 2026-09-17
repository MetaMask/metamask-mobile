import React from 'react';
import { ScrollView } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { CANDLE_PERIODS, CandlePeriod } from '@metamask/perps-controller';
import { selectorStyleSheet } from './PerpsCandlestickChartIntervalSelector.styles.ts';
import {
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';

interface PerpsCandlestickChartIntervalSelectorProps {
  selectedInterval: CandlePeriod | string;
  onIntervalChange?: (interval: CandlePeriod) => void;
  testID?: string;
  style?: object;
  disabled?: boolean;
}

const PerpsCandlestickChartIntervalSelector: React.FC<
  PerpsCandlestickChartIntervalSelectorProps
> = ({ selectedInterval, onIntervalChange, testID, style, disabled = false }) => {
  const { styles } = useStyles(selectorStyleSheet);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.intervalSelector, style]}
      contentContainerStyle={styles.intervalSelectorContent}
      testID={testID}
    >
      <FilterButtonGroup
        value={selectedInterval as string}
        onChange={(value) => !disabled && onIntervalChange?.(value as CandlePeriod)}
        variant={FilterButtonVariant.Secondary}
      >
        {CANDLE_PERIODS.map((interval) => (
          <FilterButton
            key={interval.value}
            value={interval.value}
            size={FilterButtonSize.Sm}
            testID={`${testID}-${interval.value}`}
            isDisabled={disabled}
          >
            {interval.label}
          </FilterButton>
        ))}
      </FilterButtonGroup>
    </ScrollView>
  );
};

export default PerpsCandlestickChartIntervalSelector;
