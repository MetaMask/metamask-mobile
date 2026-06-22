import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { fontStyles } from '../../../styles/common';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    rowBody: {
      alignItems: 'center',
      paddingTop: 10,
    },
    importTextContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    importText: {
      color: colors.text.alternative,
      fontSize: 14,
      ...fontStyles.bold,
      alignContent: 'center',
    },
  });

export type ActivityListAccountImportTimeRowStyles = ReturnType<
  typeof createStyles
>;
