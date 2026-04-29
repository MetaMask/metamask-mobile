import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 16,
    },
    amountBlock: {
      alignItems: 'center',
      gap: 4,
    },
    cardGroup: {
      gap: 8,
    },
    card: {
      backgroundColor: params.theme.colors.background.muted,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rowValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
  });

export default styleSheet;
