// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for AddNewHdAccount component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    base: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    accountInputContainer: {
      width: '100%',
      gap: 10,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.muted,
      borderRadius: 8,
    },
    accountInput: {
      display: 'flex',
      width: '100%',
      color: colors.text.default,
      backgroundColor: colors.background.muted,
    },
    srpSelectorContainer: {
      display: 'flex',
      width: '100%',
    },
    srpSelector: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.muted,
      borderRadius: 8,
    },
    srp: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      borderColor: colors.border.muted,
      backgroundColor: colors.background.muted,
    },
    srpArrow: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerContainer: {
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 16,
      gap: 16,
    },
    button: {
      flex: 1,
    },
  });
};

export default styleSheet;
