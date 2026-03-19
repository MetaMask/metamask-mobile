import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    flatList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    listItemContainer: {
      paddingVertical: 16,
    },
    musdFeaturedCard: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary.default,
      padding: 16,
      marginTop: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    musdFeaturedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    musdFeaturedInfo: {
      flex: 1,
    },
    musdGetButton: {
      backgroundColor: colors.primary.default,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    musdGetButtonText: {
      fontWeight: '600',
    },
  });
};

export default styleSheet;
