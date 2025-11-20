import { StyleSheet } from 'react-native';

/**
 * StyleSheet for the SamplePetNamesForm component
 *
 * @param params - The parameters object containing the theme
 * @param params.theme - The theme object containing color definitions and other theme properties
 * @returns StyleSheet object containing styles for the pet names form
 *
 * @sampleFeature do not use in production code
 */
const styleSheet = () =>
  StyleSheet.create({
    /**
     * Container for the pet names form section
     */
    formContainer: {
      marginTop: 24,
      paddingBottom: 24,
    },
    /**
     * Container for individual form inputs
     */
    inputContainer: {
      marginBottom: 16,
    },
    /**
     * Submit button styling
     */
    button: {
      width: '100%',
    },
  });

export default styleSheet;
