import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    controlBarContainer: {
      backgroundColor: colors.background.default,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    controlBarContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    balanceSection: {
      flex: 1,
    },
    balanceLabel: {
      marginBottom: 4,
      borderRadius: 4,
    },
    balanceValue: {
      borderRadius: 4,
    },
    actionButtonsSection: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      borderRadius: 20,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    sectionHeader: {
      paddingVertical: 16,
    },
    sectionTitle: {
      borderRadius: 4,
    },
    positionsList: {
      gap: 12,
    },
    positionCard: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    positionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    positionCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    positionIcon: {
      borderRadius: 20,
      marginRight: 12,
    },
    positionInfo: {
      gap: 4,
    },
    positionSymbol: {
      borderRadius: 4,
    },
    positionLeverage: {
      borderRadius: 4,
    },
    positionCardRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    positionPnl: {
      borderRadius: 4,
    },
    positionPercentage: {
      borderRadius: 4,
    },
  });
};

export default styleSheet;
