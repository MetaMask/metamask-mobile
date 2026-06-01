import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    list: {
      paddingBottom: 16,
      backgroundColor: params.theme.colors.background.default,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 59,
    },
    disabledRowContent: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 4,
    },
    comingSoonTag: {
      borderRadius: 8,
    },
  });

export default styleSheet;
