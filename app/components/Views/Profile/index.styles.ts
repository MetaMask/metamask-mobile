import { Colors } from '../../../util/theme/models';
import { StyleSheet } from 'react-native';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    // Profile container
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    headerTitle: {
      marginLeft: -16,
    },
    section: {
      marginTop: 16,
    },
    // Settings card
    settingsCard: {
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      padding: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    column: {},
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: 12,
    },
    first: {
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    last: {
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    separator: {
      borderTopWidth: 1,
      borderTopColor: colors.primary.inverse,
    },
  });

export default createStyles;
