import React from 'react';
import {
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { EARNINGS_RANGES, type EarningsRange } from './earningsHistory';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const RANGE_LABEL_KEYS: Record<EarningsRange, string> = {
  '1W': 'money.earnings.range_1w',
  '30D': 'money.earnings.range_1m',
  '3M': 'money.earnings.range_3m',
  '6M': 'money.earnings.range_6m',
  '1Y': 'money.earnings.range_1y',
};

interface EarningsChartRangeSelectorProps {
  selectedRange: EarningsRange;
  onRangeChange: (range: EarningsRange) => void;
}

const EarningsChartRangeSelector = ({
  selectedRange,
  onRangeChange,
}: EarningsChartRangeSelectorProps): React.ReactElement => (
  <FilterButtonGroup
    value={selectedRange}
    onChange={(range) => onRangeChange(range as EarningsRange)}
    variant={FilterButtonVariant.Secondary}
    className="w-full justify-between"
    testID={MoneyEarningsViewTestIds.RANGE_SELECTOR}
    scrollEnabled={false}
  >
    {EARNINGS_RANGES.map((range) => {
      const label = strings(RANGE_LABEL_KEYS[range]);
      const isSelected = selectedRange === range;

      return (
        <FilterButton
          key={range}
          value={range}
          size={FilterButtonSize.Sm}
          isSelected={isSelected}
          accessibilityLabel={label}
          accessibilityState={{ selected: isSelected }}
        >
          {label}
        </FilterButton>
      );
    })}
  </FilterButtonGroup>
);

export default EarningsChartRangeSelector;
