import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import scaling from '../../../util/scaling';
import type { ThemeColors } from '@metamask/design-tokens';

const createNetworkModalStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 0,
      maxHeight: '85%',
      paddingBottom: 20,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    modalContainer: {
      borderRadius: 10,
      backgroundColor: colors.background.default,
      padding: 4,
      paddingTop: 4,
      maxHeight: '80%',
    },
    title: {
      ...fontStyles.bold,
      fontSize: scaling.scale(18),
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 34,
      marginVertical: 10,
      paddingHorizontal: 16,
    },
    bottomSpace: {
      marginBottom: 10,
    },
    actionContainer: {
      flex: 0,
      paddingVertical: 16,
      justifyContent: 'center',
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
    },
    notchWrapper: {
      alignSelf: 'stretch',
      padding: 4,
      alignItems: 'center',
    },
  });

export default createNetworkModalStyles;
