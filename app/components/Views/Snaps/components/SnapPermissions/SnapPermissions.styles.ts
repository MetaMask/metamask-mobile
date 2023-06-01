import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    section: {
      paddingTop: 32,
    },
    permissionCell: {
      borderRadius: 10,
      borderWidth: 0,
    },
    cellBase: {
      flexDirection: 'row',
    },
    cellBaseInfo: {
      flex: 1,
      alignItems: 'flex-start',
    },
    secondaryText: {
      color: colors.text.alternative,
    },
    iconWrapper: {
      marginTop: 16,
      marginRight: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};
export default styleSheet;
