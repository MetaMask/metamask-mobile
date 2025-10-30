import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { Box } from '@metamask/design-system-react-native';
import {
  selectBridgeControllerState,
  selectBridgeFeatureFlags,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { getQuoteRefreshRate } from '../../utils/quoteUtils';
import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    container: {
      minWidth: 40,
    },
  });

/**
 * Countdown timer component that displays time remaining until quote refresh
 */
const QuoteCountdownTimer: React.FC = () => {
  const styles = createStyles();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const sourceToken = useSelector(selectSourceToken);

  const { quotesLastFetched } = bridgeControllerState;
  const refreshRate = getQuoteRefreshRate(bridgeFeatureFlags, sourceToken);

  useEffect(() => {
    if (!quotesLastFetched) {
      setSecondsRemaining(0);
      return;
    }

    const calculateSecondsRemaining = () => {
      const elapsed = Date.now() - quotesLastFetched;
      const remaining = Math.max(0, Math.ceil((refreshRate - elapsed) / 1000));
      return remaining;
    };

    // Initial calculation
    setSecondsRemaining(calculateSecondsRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateSecondsRemaining();
      setSecondsRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [quotesLastFetched, refreshRate]);

  if (!quotesLastFetched) {
    return null;
  }

  // Use fixed-width formatting to prevent UI jumping
  // Pad single digits with a space to maintain consistent width
  const formattedSeconds =
    secondsRemaining < 10 ? `0${secondsRemaining}` : `${secondsRemaining}`;

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {`0:${formattedSeconds}`}
      </Text>
    </Box>
  );
};

export default QuoteCountdownTimer;
