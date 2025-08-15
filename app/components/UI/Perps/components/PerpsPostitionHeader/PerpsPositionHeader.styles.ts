import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      padding: 16,
    },
    backButton: {
      marginRight: 8,
    },
    leftSection: {
      alignItems: 'flex-start',
      flex: 1,
    },
    rightSection: {
      alignItems: 'flex-end',
      flex: 1,
    },
    perpIcon: {
      marginRight: 16,
      width: 32,
      height: 32,
    },
    tokenIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    positionInfo: {
      flex: 1,
    },
    assetInfo: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    assetName: {
      marginRight: 12,
    },

    positionValue: {
      marginBottom: 0,
    },
    positionValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    priceChange24h: {
      marginLeft: 8,
    },
    pnlContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pnlText: {
      marginRight: 8,
    },
    unrealizedLabel: {
      marginLeft: 4,
    },
    chartSection: {
      marginLeft: 16,
      alignItems: 'flex-end',
    },
    chartPlaceholder: {
      width: 80,
      height: 50,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};
