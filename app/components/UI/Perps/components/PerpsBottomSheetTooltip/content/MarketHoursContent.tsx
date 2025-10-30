import React, { useState, useEffect } from 'react';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import { getMarketHoursStatus } from '../../../utils/marketHours';

interface MarketHoursContentProps extends TooltipContentProps {
  data?: {
    isOpen?: boolean;
  };
}

const MarketHoursContent = ({ testID, data }: MarketHoursContentProps) => {
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
  const titleKey = isOpen
    ? 'perps.tooltips.market_hours.title'
    : 'perps.tooltips.after_hours_trading.title';

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
      {/* Clock Icon */}
      <Box alignItems={BoxAlignItems.Center} twClassName="mt-2 mb-4">
        <Icon name={IconName.Clock} size={IconSize.Lg} />
      </Box>

      {/* Title */}
      <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
        <Text variant={TextVariant.HeadingMd}>{strings(titleKey)}</Text>
      </Box>

      {/* Countdown Pill */}
      <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
        <Box twClassName="bg-alternative rounded-[52px] px-4 py-2">
          <Text variant={TextVariant.BodyMd}>
            <Text color={TextColor.TextAlternative}>{countdownLabel} </Text>
            <Text color={TextColor.TextDefault}>
              {marketStatus.countdownText}
            </Text>
          </Text>
        </Box>
      </Box>

      {/* Body Text */}
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings(contentKey)}
      </Text>
    </Box>
  );
};

export default MarketHoursContent;
