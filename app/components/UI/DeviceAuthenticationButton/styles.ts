/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

export const createStyles = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    fixCenterIcon: {
      marginBottom: -3,
    },
    image: {
      height: 24,
      width: 24,
      tintColor: colors.text.default,
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
  });
