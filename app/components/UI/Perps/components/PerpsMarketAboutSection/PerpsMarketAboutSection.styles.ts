import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      gap: 12,
    },
    description: {
      // Improve readability of the multi-line description paragraph
      lineHeight: 22,
    },
    // Hide the description until it has been measured for truncation to avoid
    // a flash of the fully-expanded text on first render.
    descriptionMeasuring: {
      opacity: 0,
    },
    toggle: {
      textDecorationLine: 'underline',
    },
  });

export default styleSheet;
