import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      backgroundColor: colors.background.default,
    },
    filterContainer: {
      paddingVertical: 8,
      backgroundColor: colors.background.default,
    },
    filterScrollView: {
      flexDirection: 'row',
    },
    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      borderRadius: 20,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterTabActive: {
      backgroundColor: colors.background.defaultPressed,
    },
    filterTabText: {
      color: colors.text.alternative,
    },
    emptyContainer: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyMessage: {
      textAlign: 'center',
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
  });

export default createStyles;
