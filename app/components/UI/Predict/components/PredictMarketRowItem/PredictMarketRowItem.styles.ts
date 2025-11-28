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
    iconContainer: {
      width: 40,
      height: 40,
    },
    leftContainer: {
      paddingLeft: 16,
      flex: 1,
      gap: 2,
    },
    marketHeaderRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });

export default styleSheet;
