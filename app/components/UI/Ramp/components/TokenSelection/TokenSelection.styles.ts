import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    filterBarContainer: {
      paddingVertical: 8,
    },
    list: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  });

export default styleSheet;
