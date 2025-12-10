import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 * StyleSheet for the SampleFeatureDevSettingsEntryPoint component
 *
 * @param params - The parameters object containing the theme
 * @param params.theme - The theme object containing color definitions and other theme properties
 * @returns StyleSheet object containing styles for the developer settings entry point
 *
 * @sampleFeature do not use in production code
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    /**
     * Main wrapper container
     */
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      paddingBottom: 48,
    },
    /**
     * Heading text style
     */
    heading: {
      marginTop: 16,
    },
    /**
     * Description text style
     */
    desc: {
      marginTop: 8,
    },
    /**
     * Accessory elements style
     */
    accessory: {
      marginTop: 16,
    },
  });
};

export default styleSheet;
