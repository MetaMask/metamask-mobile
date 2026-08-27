import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 59,
    },
    rowLabelContainer: {
      flex: 1,
      flexDirection: 'column',
      gap: 2,
    },
    disabledRowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    comingSoonTag: {
      borderRadius: 8,
    },
  });

export default styleSheet;
