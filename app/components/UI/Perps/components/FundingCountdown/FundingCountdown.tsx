import React, { useState, useEffect, memo } from 'react';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { calculateFundingCountdown } from '../../utils/marketUtils';

interface FundingCountdownProps {
  variant?: TextVariant;
  color?: TextColor;
  testID?: string;
}

/**
 * Isolated countdown component that updates every second
 * without causing parent re-renders
 */
const FundingCountdown: React.FC<FundingCountdownProps> = ({
  variant = TextVariant.BodySM,
  color = TextColor.Default,
  testID,
}) => {
  const [countdown, setCountdown] = useState(() => calculateFundingCountdown());

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(calculateFundingCountdown());
    };

    // Update immediately
    updateCountdown();

    // Then update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Text variant={variant} color={color} testID={testID}>
      ({countdown})
    </Text>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(FundingCountdown);
