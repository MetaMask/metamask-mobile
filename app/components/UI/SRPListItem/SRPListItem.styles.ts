// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for SRP List component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    srpItem: {
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    srpItemContent: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    srpItemIcon: {
      flexDirection: 'column',
      justifyContent: 'center',
    },
    horizontalLine: {
      height: 1,
      borderWidth: 1,
      borderColor: colors.border.muted,
      marginVertical: 4,
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    accountsList: {
      display: 'flex',
      flex: 1,
      maxHeight: 150,
    },
    accountsListContentContainer: {
      display: 'flex',
      flexGrow: 1,
      paddingVertical: 4,
    },
  });
};

export default styleSheet;
