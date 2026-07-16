import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    titleContainer: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    editableRow: {
      flex: 1,
      flexShrink: 0,
      flexBasis: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 8,
    },
    dragGridIcon: {
      width: 10,
      height: 24,
    },
    editableRowContent: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    editControlHidden: {
      width: 0,
      overflow: 'hidden',
    },
  });
};

export default styleSheet;
