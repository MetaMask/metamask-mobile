import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

export const accountSelectorElementStylesheet = (_params: {
  theme: Theme;
  vars: unknown;
}) =>
  StyleSheet.create({
    base: {
      flex: 1,
    },
    infos: {
      flex: 1,
      overflow: 'hidden',
    },
    balance: {
      marginLeft: 'auto',
    },
  });

export const accountSelectorStylesheet = (_params: {
  theme: Theme;
  vars: unknown;
}) =>
  StyleSheet.create({
    base: {
      maxHeight: 89,
    },
    item: {
      maxHeight: 89,
    },
  });
