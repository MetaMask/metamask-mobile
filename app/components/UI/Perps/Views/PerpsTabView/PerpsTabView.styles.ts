import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    tradeInfoContainer: {
      paddingBottom: 12,
    },
    firstTimeIcon: {
      width: 48,
      height: 48,
      marginTop: 16,
      marginBottom: 8,
    },
    wrapper: {
      backgroundColor: colors.background.default,
    },
    content: {},
    contentContainer: {},
    section: {},
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionTitle: {
      paddingTop: 16,
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 8,
    },
    loadingContainer: {
      padding: 24,
      alignItems: 'center',
      marginTop: 10,
      borderRadius: 12,
    },
    // Order card styles to match position cards
    positionCard: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginVertical: 2,
    },
    positionCardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    positionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    assetIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    positionInfo: {
      flex: 1,
    },
    positionRight: {
      alignItems: 'flex-end',
    },
    startTradeCTA: {
      paddingVertical: 12,
      marginVertical: 2,
      borderRadius: 8,
    },
    startTradeContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    startTradeIconContainer: {
      width: 40,
      height: 40,
      borderWidth: 0,
      borderRadius: 20,
      backgroundColor: colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    startTradeText: {
      marginLeft: 12,
      flex: 1,
    },
  });
};

export default styleSheet;
