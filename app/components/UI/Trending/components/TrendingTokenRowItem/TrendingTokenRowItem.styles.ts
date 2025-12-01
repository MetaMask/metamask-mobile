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
  });

export default styleSheet;
