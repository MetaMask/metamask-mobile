import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    rowWrapper: {
      paddingVertical: 16,
    },
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingVertical: 16,
      height: '85%',
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
      paddingVertical: 24,
      paddingTop: 0,
      borderWidth: 0,
      paddingHorizontal: 16,
    },
    box: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 8,
      paddingBottom: 20,
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
    bottomContainer: {
      bottom: 20,
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
    button: {
      paddingHorizontal: 16,
      top: 16,
    },
  });

export default createStyles;
