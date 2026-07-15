import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { formatQuoteCountdown } from '../utils/formatQuoteCountdown';

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
  const lastFetchedRef = useRef(quotesLastFetchedAt);
  const refreshRateRef = useRef(quoteRefreshRateMs);
  lastFetchedRef.current = quotesLastFetchedAt;
  refreshRateRef.current = quoteRefreshRateMs;

  const computeRemaining = () => {
    const lastFetched = lastFetchedRef.current;
    if (!lastFetched) return 0;
    const elapsed = Date.now() - lastFetched;
    return Math.max(0, Math.ceil((refreshRateRef.current - elapsed) / 1000));
  };

  const [secondsRemaining, setSecondsRemaining] = useState(computeRemaining);

  useFocusEffect(
    useCallback(() => {
      // Snap to truth immediately when focus returns (covers the post-overlay
      // case where ticks were missed while the subtree was suspended).
      setSecondsRemaining(computeRemaining());
      const interval = setInterval(() => {
        setSecondsRemaining(computeRemaining());
      }, 1000);
      return () => clearInterval(interval);
      // computeRemaining only reads refs — safe to omit from deps.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!quotesLastFetchedAt) {
    return null;
  }

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {formatQuoteCountdown(secondsRemaining)}
      </Text>
    </Box>
  );
};

export default QuickBuyQuoteCountdown;
