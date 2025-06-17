import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

/**
 * StyleSheet for the SampleFeature component
 *
 * @param {Object} params - The parameters object
 * @param {Theme} params.theme - The theme object containing color definitions and other theme properties
 *
 * @returns {StyleSheet} A StyleSheet object containing the following styles:
 * - wrapper: Main container style with background color and padding
 * - heading: Style for the main heading text
 * - desc: Style for the description text
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
      padding: 24,
      paddingBottom: 48,
    },
    heading: {
      marginTop: 16,
    },
    desc: {
      marginTop: 8,
    },
  });
};

export default styleSheet;
