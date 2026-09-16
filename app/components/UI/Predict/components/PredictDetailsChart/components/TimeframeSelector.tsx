import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';

interface TimeframeSelectorProps {
  timeframes: string[];
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  disabled?: boolean;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  disabled = false,
}) => {
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-1"
    >
      <FilterButtonGroup
        value={selectedTimeframe}
        onChange={(value) => !disabled && onTimeframeChange(value)}
        variant={FilterButtonVariant.Secondary}
        twClassName="flex-1"
      >
        {timeframes.map((timeframe) => (
          <FilterButton
            key={timeframe}
            value={timeframe}
            size={FilterButtonSize.Sm}
            twClassName="flex-1"
            isDisabled={disabled}
          >
            {timeframe.toUpperCase()}
          </FilterButton>
        ))}
      </FilterButtonGroup>
    </Box>
  );
};

export default TimeframeSelector;
