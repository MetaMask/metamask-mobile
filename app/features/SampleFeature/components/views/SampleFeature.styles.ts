import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

/**
 * StyleSheet for the SampleFeature component
 *
 * @param {Object} params - The parameters object
 * @param {Theme} params.theme - The theme object containing color definitions and other theme properties
 *
 * @returns {StyleSheet} A StyleSheet object containing the following styles:
 * - wrapper: Main container style with background color
 * - content: Padding for the scrollable content below the header
 *
 * @sampleFeature do not use in production code
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      padding: 24,
      paddingBottom: 48,
    },
  });
};

export default styleSheet;
