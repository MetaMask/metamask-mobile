import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  BoxAlignItems,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import { StyleSheet } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import { getMarketHoursStatus } from '../../../utils/marketHours';

interface MarketHoursContentProps extends TooltipContentProps {
  data?: {
    isOpen?: boolean;
  };
}

const styleSheet = () =>
  StyleSheet.create({
    countdownContainer: {
      marginBottom: 16,
    },
    countdownPill: {
      borderRadius: 52,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  });

const MarketHoursContent = ({ testID, data }: MarketHoursContentProps) => {
  const { styles } = useStyles(styleSheet, {});

  // Get initial market hours status
  const [marketStatus, setMarketStatus] = useState(() =>
    getMarketHoursStatus(),
  );

  // Update countdown every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setMarketStatus(getMarketHoursStatus());
    }, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, []);

  // Use the data.isOpen if provided, otherwise use calculated status
  const isOpen = data?.isOpen ?? marketStatus.isOpen;

  // Determine which strings to use
  const contentKey = isOpen
    ? 'perps.tooltips.market_hours.content'
    : 'perps.tooltips.after_hours_trading.content';

  // Get just the label text (e.g., "Reopens in" or "Closes in")
  const countdownLabel = isOpen
    ? strings('perps.tooltips.market_hours.closes_in', { time: '' }).trim()
    : strings('perps.tooltips.after_hours_trading.reopens_in', {
        time: '',
      }).trim();

  return (
    <Box testID={testID}>
      {/* Countdown Pill */}
      <Box alignItems={BoxAlignItems.Center} style={styles.countdownContainer}>
        <Box
          style={styles.countdownPill}
          backgroundColor={BoxBackgroundColor.BackgroundMuted}
        >
          <Text variant={TextVariant.BodyMd}>
            <Text color={TextColor.TextAlternative}>{countdownLabel} </Text>
            <Text color={TextColor.TextDefault}>
              {marketStatus.countdownText}
            </Text>
          </Text>
        </Box>
      </Box>

      {/* Body Text */}
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {strings(contentKey)}
      </Text>
    </Box>
  );
};

export default MarketHoursContent;
