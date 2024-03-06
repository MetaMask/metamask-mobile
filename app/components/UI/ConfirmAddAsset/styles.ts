import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    rowWrapper: {
      padding: 20,
      gap: 26,
    },
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      height: '80%',
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
      paddingBottom: 21,
      paddingTop: 0,
      borderWidth: 0,
    },
    box: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 8,
      paddingBottom: 20,
      borderWidth: 0,
      padding: 0,
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
      flex: 1,
      paddingVertical: 16,
      bottom: 20,
    },
    assetIcon: {
      width: 40,
      height: 40,
    },

    balanceFiat: {
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
