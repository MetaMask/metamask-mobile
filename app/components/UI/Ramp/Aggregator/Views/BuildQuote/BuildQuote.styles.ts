import { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    viewContainer: {
      flex: 1,
    },
    selectors: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    spacer: {
      minWidth: 8,
    },
    cta: {
      paddingTop: 12,
    },
    flexRow: {
      flexDirection: 'row',
    },
    flagText: {
      marginVertical: 3,
      marginHorizontal: 0,
    },
  });

export default styleSheet;
