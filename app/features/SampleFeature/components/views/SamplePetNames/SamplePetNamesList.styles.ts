import { StyleSheet } from 'react-native';

/**
 * StyleSheet for the SamplePetNamesList component
 *
 * @param params - The parameters object containing the theme
 * @param params.theme - The theme object containing color definitions and other theme properties
 * @returns StyleSheet object containing styles for the pet names list
 *
 * @sampleFeature do not use in production code
 */
const styleSheet = () =>
  StyleSheet.create({
    /**
     * Individual pet name list item container
     */
    petNameListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      padding: 8,
    },
    /**
     * Text container within list items
     */
    listItemTextContainer: {
      marginLeft: 12,
      flex: 1,
    },
  });

export default styleSheet;
