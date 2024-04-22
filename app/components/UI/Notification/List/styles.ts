/* eslint-disable import/prefer-default-export */
import { StyleSheet, TextStyle } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

export const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    loaderContainer: {
      position: 'absolute',
      zIndex: 999,
      width: '100%',
      height: '100%',
    },
    base: {
      paddingHorizontal: 16,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabStyle: {
      paddingBottom: 0,
      paddingVertical: 8,
    },
    tabBar: {
      borderColor: colors.background.default,
      marginTop: 16,
    },
    textStyle: {
      ...(typography.sBodyMD as TextStyle),
      fontWeight: '500',
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    TabWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    list: { flexGrow: 1 },
  });
