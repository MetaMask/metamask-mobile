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
      alignItems: 'center',
      padding: 16,
      marginBottom: 16,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
    },
    srpItemContent: {
      display: 'flex',
      flexShrink: 1,
      width: '100%',
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
      width: '100%',
      borderBottomWidth: 1,
      borderColor: colors.border.muted,
      marginTop: 8,
      marginBottom: 8,
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    accountsList: {
      display: 'flex',
    },
    accountsListContentContainer: {
      display: 'flex',
      paddingVertical: 4,
    },
  });
};

export default styleSheet;
