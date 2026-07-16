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
      flexDirection: 'row',
      alignItems: 'center',
    },
    dragHandle: {
      paddingRight: 8,
    },
    unwatchStar: {
      paddingLeft: 8,
    },
    editableRowContent: {
      flex: 1,
    },
    editControlHidden: {
      width: 0,
      overflow: 'hidden',
    },
  });
};

export default styleSheet;
