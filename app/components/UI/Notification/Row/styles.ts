/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

export const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
    },
    fox: {
      width: 20,
      height: 20,
    },
    badgeWrapper: { alignSelf: 'center' },
    rowContainer: { flex: 1, marginLeft: 16 },
    rowInsider: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    foxWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    textBox: {
      flexShrink: 1,
      maxWidth: '90%',
    },
    button: {
      marginTop: 16,
      width: '100%',
      alignSelf: 'center',
    },
  });
