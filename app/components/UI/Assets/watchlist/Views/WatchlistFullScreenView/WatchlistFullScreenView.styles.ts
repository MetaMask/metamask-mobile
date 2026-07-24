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
      paddingBottom: 8,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    listContainerEditMode: {
      paddingRight: 8,
    },
    emptyContentContainer: {
      flex: 1,
    },
    editableRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    dragHandle: {
      height: 40,
      marginTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: 12,
    },
    unwatchStar: {
      height: 40,
      marginTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 16,
      zIndex: 1,
    },
    editableRowContent: {
      flex: 1,
      minWidth: 0,
    },
    editControlHidden: {
      width: 0,
      overflow: 'hidden',
    },
    headerEndActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
  });
};

export default styleSheet;
