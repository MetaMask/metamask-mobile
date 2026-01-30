import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      paddingTop: 8,
      paddingBottom: 8,
      gap: 16,
    },
    badge: {
      borderRadius: 16,
    },
    leftContainer: {
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
    stockBadgeWrapper: {
      marginTop: 4,
    },
  });

export default styleSheet;
