import { StyleSheet } from 'react-native';

export const createStyles = () =>
  StyleSheet.create({
    // Offscreen remount target after a slider gesture — keep StyleSheet for
    // absoluteFill; Tailwind cannot express this cleanly.
    sliderIncoming: {
      ...StyleSheet.absoluteFill,
      opacity: 0,
    },
    helpTextContainer: {
      // Reserve space for up to two lines of HelpText so skeleton ↔ text
      // swaps (and wrap changes as the % updates) don't shift content below.
      minHeight: 40,
    },
    priceInfoContainer: {
      // Reserve vertical space whether price data is available or not,
      // preventing a layout jump when switching between the two states.
      minHeight: 80,
    },
  });
