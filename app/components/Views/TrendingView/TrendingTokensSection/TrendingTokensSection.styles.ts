import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    contentContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.background.muted,
    },
    cardContainer: {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.muted,
      borderColor: theme.colors.border.muted,
    },
  });
};

export default styleSheet;
