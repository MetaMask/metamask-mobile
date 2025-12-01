import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      // Let content determine height
    },
    header: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: params.theme.colors.border.muted,
    },
    headerColumn: {
      flex: 1,
    },
    headerColumnCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerColumnRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    bookContainer: {
      flexDirection: 'row',
    },
    bidsSide: {
      flex: 1,
    },
    asksSide: {
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 2,
      position: 'relative',
    },
    bidRow: {
      flexDirection: 'row-reverse', // Flip for bid side (total on left)
    },
    depthBar: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      opacity: 0.15,
    },
    bidDepthBar: {
      right: 0,
      backgroundColor: params.theme.colors.success.default,
    },
    askDepthBar: {
      left: 0,
      backgroundColor: params.theme.colors.error.default,
    },
    totalColumn: {
      flex: 1,
      zIndex: 1,
    },
    totalColumnRight: {
      flex: 1,
      alignItems: 'flex-end',
      zIndex: 1,
    },
    priceColumn: {
      flex: 1,
      alignItems: 'center',
      zIndex: 1,
    },
    priceColumnBid: {
      flex: 1,
      alignItems: 'flex-end',
      paddingRight: 8,
      zIndex: 1,
    },
    priceColumnAsk: {
      flex: 1,
      alignItems: 'flex-start',
      paddingLeft: 8,
      zIndex: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 48,
    },
    spreadContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 4,
      borderTopWidth: 1,
      borderTopColor: params.theme.colors.border.muted,
    },
  });

export default styleSheet;
