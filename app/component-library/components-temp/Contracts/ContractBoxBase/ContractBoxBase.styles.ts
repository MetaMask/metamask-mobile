// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
/**
 * Style sheet for Account Balance component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flex: 1,
    },
    rowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageContainer: {
      marginRight: 16,
    },
    icon: {
      paddingHorizontal: 6,
    },
    iconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    header: {
      color: theme.colors.info.default,
    },
  });
};

export default styleSheet;
