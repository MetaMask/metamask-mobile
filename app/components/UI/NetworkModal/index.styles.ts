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
    alertBar: {
      width: '100%',
      marginBottom: 15,
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
    textSection: {
      marginBottom: 8,
    },
    accountCardWrapper: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      marginVertical: 16,
      maxHeight: '70%',
    },
    nestedScrollContent: { paddingBottom: 24 },
    networkSection: { marginBottom: 16 },
    textCentred: {
      textAlign: 'center',
    },
  });

export default createNetworkModalStyles;
