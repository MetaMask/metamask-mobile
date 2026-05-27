import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const styles = StyleSheet.create({
  container: {
    minWidth: 40,
  },
});

interface QuickBuyQuoteCountdownProps {
  quotesLastFetchedAt: number | null;
  quoteRefreshRateMs: number;
}

const QuickBuyQuoteCountdown: React.FC<QuickBuyQuoteCountdownProps> = ({
  quotesLastFetchedAt,
  quoteRefreshRateMs,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!quotesLastFetchedAt) {
      setSecondsRemaining(0);
      return;
    }

    const calc = () => {
      const elapsed = Date.now() - quotesLastFetchedAt;
      return Math.max(0, Math.ceil((quoteRefreshRateMs - elapsed) / 1000));
    };

    setSecondsRemaining(calc());
    const interval = setInterval(() => setSecondsRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [quotesLastFetchedAt, quoteRefreshRateMs]);

  if (!quotesLastFetchedAt) {
    return null;
  }

  const formatted =
    secondsRemaining < 10 ? `0${secondsRemaining}` : `${secondsRemaining}`;

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {`0:${formatted}`}
      </Text>
    </Box>
  );
};

export default QuickBuyQuoteCountdown;
