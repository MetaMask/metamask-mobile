import { StyleSheet } from 'react-native';

/**
 * StyleSheet for the SampleCounterPane component
 *
 * @param params - The parameters object containing the theme
 * @param params.theme - The theme object containing color definitions and other theme properties
 * @returns StyleSheet object containing styles for the counter card and its button
 *
 * @sampleFeature do not use in production code
 */
const styleSheet = () =>
  StyleSheet.create({
    /**
     * Main card container
     */
    card: {
      width: '100%',
    },
    /**
     * Increment button styling
     */
    button: {
      width: '100%',
    },
  });

export default styleSheet;
