import { StyleSheet } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 20,
      color: colors.text.muted,
      ...fontStyles.normal,
    },
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default createStyles;
