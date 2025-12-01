import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    description: {
      marginBottom: 24,
    },
    detailsWrapper: {
      gap: 1,
      marginBottom: 16,
    },
    detailItem: {
      backgroundColor: theme.colors.background.alternative,
      overflow: 'hidden',
    },
    detailItemFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    detailItemLast: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    detailItemWrapper: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    directionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    directionText: {
      marginHorizontal: 8,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    infoLabel: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 16,
    },
    footerContainer: {
      paddingTop: 16,
    },
  });

export default createStyles;
