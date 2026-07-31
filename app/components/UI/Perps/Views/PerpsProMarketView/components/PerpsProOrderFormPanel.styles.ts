import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';
import { PRO_ORDER_BOOK_SEPARATOR_INSET } from './PerpsProMarketLayout.styles';

export { PRO_ORDER_BOOK_SEPARATOR_INSET };

export const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'flex-start',
      paddingTop: 16,
    },
    panelWithBookSeparator: {
      paddingRight: PRO_ORDER_BOOK_SEPARATOR_INSET,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border.muted,
    },
  });
