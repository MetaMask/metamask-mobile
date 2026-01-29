import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    tradeInfoContainer: {
      paddingBottom: 30,
    },
    emptyStateContainer: {
      paddingBottom: 30,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingTop: 16,
    },
    sectionTitle: {
      // Removed paddingTop - now on parent sectionHeader for consistent alignment
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
    // Section style overrides for PerpsTabView - flat list without card styling
    watchlistSectionStyle: {
      marginBottom: 0,
    },
    watchlistHeaderStyle: {
      paddingTop: 24,
      paddingHorizontal: 16,
      paddingBottom: 4,
      marginBottom: 0,
    },
    // Explore markets section style variants based on what's above
    exploreMarketsSectionNoBalance: {
      marginBottom: 0,
    },
    exploreMarketsSectionWithBalance: {
      marginBottom: 0,
    },
    exploreMarketsSectionWithWatchlist: {
      marginBottom: 0,
    },
    exploreMarketsHeaderStyle: {
      paddingTop: 20,
      paddingHorizontal: 16,
      paddingBottom: 8,
      marginBottom: 0,
    },
    // Flat content container - no card styling
    // Note: horizontal padding comes from internal listContent/PerpsMarketList styles
    flatContentContainerStyle: {
      marginHorizontal: 0,
      borderRadius: 0,
      paddingTop: 0,
      paddingBottom: 0,
      backgroundColor: colors.background.default,
    },
  });
};

export default styleSheet;
