// Third party dependencies.
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for AvatarIcon component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    balancesContainer: {
      alignItems: 'flex-end',
      flexDirection: 'column',
    },
    balanceLabel: { textAlign: 'right', ...fontStyles.medium },
    titleText: { ...fontStyles.medium },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
    },
    sectionDetailsLink: {
      color: theme.colors.primary.default,
    },
    sectionSeparator: {
      height: 1,
      backgroundColor: theme.colors.border.default,
      opacity: 0.4,
      marginVertical: 8,
    },
    listContainer: {
      flexGrow: 1,
      flexShrink: 1,
      flexDirection: 'row',
    },
  });

export default styleSheet;
