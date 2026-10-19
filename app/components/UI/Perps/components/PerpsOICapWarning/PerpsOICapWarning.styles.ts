import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inlineContainer: {
      paddingVertical: 8,
    },
    textContainer: {
      flex: 1,
      gap: 4,
    },
  });

export default styleSheet;
