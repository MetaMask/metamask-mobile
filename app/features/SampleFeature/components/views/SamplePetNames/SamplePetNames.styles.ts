import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 * StyleSheet for the SamplePetNames component
 *
 * @param params - The parameters object containing the theme
 * @param params.theme - The theme object containing color definitions and other theme properties
 * @returns StyleSheet object containing styles for the pet names management interface
 *
 * @sampleFeature do not use in production code
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    /**
     * Main wrapper for the safe area view
     */
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      marginTop: 16,
    },
    /**
     * Container for keyboard avoiding behavior
     */
    keyboardAvoidingView: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
    },
    /**
     * Card container for pet names list and form
     */
    card: {
      width: '100%',
    },
  });
};

export default styleSheet;
