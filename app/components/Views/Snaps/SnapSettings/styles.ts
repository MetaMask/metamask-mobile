/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    snapSettingsContainer: {
      flex: 1,
    },
    snapInfoContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: 16,
      borderWidth: 2,
      borderColor: colors.border.default,
    },
    snapCell: {
      borderRadius: 10,
      borderWidth: 0,
    },
    detailsContainerWithBorder: {
      padding: 16,
      borderColor: colors.border.default,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailsContainer: {
      padding: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    versionBadgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.alternative,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 16,
    },
    versionBadgeItem: {
      padding: 2,
    },
  });
