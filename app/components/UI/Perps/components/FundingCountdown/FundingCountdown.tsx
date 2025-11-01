import React, { useState, useEffect, memo } from 'react';
import type { TextStyle } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { calculateFundingCountdown } from '../../utils/marketUtils';

interface FundingCountdownProps {
  variant?: TextVariant;
  color?: TextColor;
  style?: TextStyle;
  testID?: string;
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   */
  fundingIntervalHours?: number;
}

/**
 * Isolated countdown component that updates every second
 * without causing parent re-renders.
 * Supports market-specific funding times when provided.
 */
const FundingCountdown: React.FC<FundingCountdownProps> = ({
  variant = TextVariant.BodySM,
  color = TextColor.Default,
  style,
  testID,
  nextFundingTime,
  fundingIntervalHours,
}) => {
  const [countdown, setCountdown] = useState(() =>
    calculateFundingCountdown({ nextFundingTime, fundingIntervalHours }),
  );

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(
        calculateFundingCountdown({ nextFundingTime, fundingIntervalHours }),
      );
    };

    // Update immediately
    updateCountdown();

    // Then update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextFundingTime, fundingIntervalHours]);

  return (
    <Text variant={variant} color={color} style={style} testID={testID}>
      ({countdown})
    </Text>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(FundingCountdown);
