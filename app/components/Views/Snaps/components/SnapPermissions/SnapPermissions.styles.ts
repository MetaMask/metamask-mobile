/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 * Style sheet function for ModalConfirmation component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
export const styleSheet = (params: { theme: Theme }) => {
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
    icon: {
      marginTop: 16,
      marginRight: 16,
    },
    cellBaseInfo: {
      flex: 1,
      alignItems: 'flex-start',
    },
    secondaryText: {
      color: colors.text.alternative,
    },
  });
};
export default styleSheet;
