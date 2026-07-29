///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
    snapInfoContainer: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
    },
    snapCell: {
      paddingVertical: 20,
    },
    snapId: {
      marginTop: 4,
    },
    detailsContainerWithBorder: {
      paddingVertical: 16,
      borderColor: colors.border.muted,
      borderTopWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailsContainer: {
      paddingVertical: 16,
      borderColor: colors.border.muted,
      borderTopWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailsLabel: {
      flex: 1,
      marginRight: 16,
    },
    detailsValue: {
      alignItems: 'flex-end',
      flex: 1,
    },
    installOrigin: {
      textTransform: 'capitalize',
    },
  });
};

export default styleSheet;
///: END:ONLY_INCLUDE_IF
