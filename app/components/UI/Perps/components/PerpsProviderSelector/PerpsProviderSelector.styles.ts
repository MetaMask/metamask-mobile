import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    // Badge styles (header indicator)
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
    },
    badgeIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 6,
    },
    badgeText: {
      marginRight: 4,
    },
    badgeChevron: {
      marginLeft: 2,
    },
    badgeCollateral: {
      opacity: 0.7,
    },

    // Bottom sheet styles
    sheetContainer: {
      paddingBottom: 16,
    },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    providerRowSelected: {
      backgroundColor: colors.primary.muted,
    },
    providerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    providerInfo: {
      flex: 1,
    },
    providerName: {
      marginBottom: 2,
    },
    providerDetails: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    providerChain: {
      marginRight: 8,
    },
    checkmark: {
      marginLeft: 8,
    },

    // Warning modal styles
    warningContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    warningIcon: {
      alignSelf: 'center',
      marginBottom: 16,
    },
    warningTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    warningMessage: {
      textAlign: 'center',
      marginBottom: 16,
    },
    warningFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    warningButton: {
      flex: 1,
    },
  });
};

export default createStyles;
