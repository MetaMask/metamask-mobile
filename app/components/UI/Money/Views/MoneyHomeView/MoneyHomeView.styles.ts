import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    footerOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
  });

export default styleSheet;
