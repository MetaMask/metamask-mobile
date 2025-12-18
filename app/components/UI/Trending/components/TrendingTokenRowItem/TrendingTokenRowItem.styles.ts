import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      paddingTop: 8,
      paddingBottom: 8,
    },
    badge: {
      borderRadius: 16,
    },
    leftContainer: {
      paddingLeft: 16,
      flex: 1,
    },
    tokenHeaderRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rightContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      gap: 2,
      alignSelf: 'stretch',
    },
    stockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 4,
      alignSelf: 'flex-start',
    },
  });
};

export default styleSheet;
