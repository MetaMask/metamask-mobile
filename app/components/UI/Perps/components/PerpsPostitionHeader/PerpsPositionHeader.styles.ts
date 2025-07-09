import { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      margin: 16,
      backgroundColor: colors.background.default,
      padding: 16,
    },
    leftSection: {
      alignItems: 'flex-start' as const,
      flex: 1,
    },
    rightSection: {
      alignItems: 'flex-end' as const,
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
      flexDirection: 'column' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 8,
    },
    assetName: {
      marginRight: 12,
    },

    positionValue: {
      marginBottom: 8,
    },
    pnlContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    pnlText: {
      marginRight: 8,
    },
    unrealizedLabel: {
      marginLeft: 4,
    },
    chartSection: {
      marginLeft: 16,
      alignItems: 'flex-end' as const,
    },
    chartPlaceholder: {
      width: 80,
      height: 50,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  };
};
