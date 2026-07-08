import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      // Let content determine height
    },
    header: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: params.theme.colors.border.muted,
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
      paddingVertical: 2,
      position: 'relative',
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
      minWidth: 0,
      zIndex: 1,
    },
    totalColumnRight: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-end',
      zIndex: 1,
    },
    priceColumnBid: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-end',
      paddingRight: 8,
      zIndex: 1,
    },
    priceColumnAsk: {
      flex: 1,
      minWidth: 0,
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
