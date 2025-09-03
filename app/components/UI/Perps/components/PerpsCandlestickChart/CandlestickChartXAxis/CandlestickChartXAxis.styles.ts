import { StyleSheet } from 'react-native';

export const styleSheet = () =>
  StyleSheet.create({
    timeAxisContainer: {
      width: '100%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 40, // Increased height to accommodate two lines
      marginTop: 4,
      marginBottom: 8,
      paddingRight: 50, // Match the chart's right padding to align with rightmost candle
    },
    timeLabel: {
      position: 'absolute',
      textAlign: 'center',
      minWidth: 50, // Increased width to accommodate date text
      transform: [{ translateX: -25 }], // Adjusted centering for wider label
      lineHeight: 16, // Set line height for better spacing between lines
    },
  });
