import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: params.theme.colors.error.muted,
      borderRadius: 4,
      overflow: 'hidden',
    },
    border: {
      width: 4,
      backgroundColor: params.theme.colors.error.default,
    },
    content: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    message: {
      color: params.theme.colors.text.default,
    },
  });

export default styleSheet;
