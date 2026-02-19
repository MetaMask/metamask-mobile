/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

export const createStyles = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    fixCenterIcon: {
      marginBottom: -3,
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
  });
