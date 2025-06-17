import { StyleSheet } from 'react-native';

/**
 * StyleSheet for the SampleNetworkDisplay component
 *
 * Defines the layout and styling for the network display container and text.
 * The styles create a horizontal layout with centered alignment and proper spacing.
 *
 * @returns {StyleSheet} A StyleSheet object containing the following styles:
 * - container: Styles for the main container with flex row layout and spacing
 * - text: Styles for the network name text (currently empty, can be customized as needed)
 */
const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 8,
      padding: 16,
      justifyContent: 'center',
    },
    text: {
      // Add any text styling here if needed
    },
  });

export default styleSheet;
