import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 * StyleSheet for the SampleNetworkDisplay component
 *
 * @param params - The parameters object containing the theme
 * @param params.theme - The theme object containing color definitions and other theme properties
 * @returns StyleSheet object containing styles for the network display container and text
 *
 * @sampleFeature do not use in production code
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    /**
     * Main container with horizontal layout for network display
     */
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 8,
      padding: 16,
      justifyContent: 'center',
    },
    /**
     * Network name text style (placeholder for future customization)
     */
    text: {
      color: theme.colors.text.default,
    },
  });
};

export default styleSheet;
