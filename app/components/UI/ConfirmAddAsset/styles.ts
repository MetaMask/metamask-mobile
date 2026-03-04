import { StyleSheet, Platform } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    rowWrapper: {
      flex: 1,
      paddingVertical: 16,
      backgroundColor: colors.background.default,
    },
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    editNetworkButton: {
      width: '100%',
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
      alignSelf: 'center',
      marginTop: 4,
    },
    boxContent: {
      backgroundColor: colors.background.default,
      paddingTop: 0,
      borderWidth: 0,
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 0,
    },
    modalFooterContainer: {
      backgroundColor: colors.background.default,
      borderWidth: 0,
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    box: {
      backgroundColor: colors.background.default,
      borderWidth: 0,
      padding: 0,
      borderRadius: 8,
    },
    title: {
      textAlign: 'center',
    },
    skeleton: { width: 50 },
    assetElement: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 10,
      gap: 20,
      paddingVertical: 20,
    },
    badge: {
      gap: 70,
    },
    buttonContainer: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    assetIcon: {
      width: 32,
      height: 32,
    },

    balanceFiat: {
      color: colors.text.default,
      ...fontStyles.normal,
      textTransform: 'uppercase',
      justifyContent: 'flex-end',
    },
    symbolText: {
      color: colors.text.alternative,
      ...fontStyles.normal,
      textTransform: 'uppercase',
      justifyContent: 'flex-end',
    },
    balanceSection: {
      position: 'absolute',
      right: 0,
    },
  });

export default createStyles;
