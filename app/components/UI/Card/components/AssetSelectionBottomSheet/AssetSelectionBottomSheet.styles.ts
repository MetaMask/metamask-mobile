import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.overlay.default,
      justifyContent: 'flex-end',
      zIndex: 1000,
    },
    bottomSheet: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      minHeight: '50%',
    },
    scrollView: {
      maxHeight: '75%',
      minHeight: '50%',
    },
    dragHandle: {
      width: 48,
      height: 6,
      backgroundColor: theme.colors.border.muted,
      borderRadius: 3,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    title: {
      flex: 1,
      textAlign: 'center',
    },
    closeIcon: {
      marginLeft: 16,
    },
    tokenList: {
      flex: 1,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      textAlign: 'center',
    },
    tokenItem: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    tokenIcon: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenName: {
      color: theme.colors.text.alternative,
      marginTop: 2,
    },
    tokenStatus: {
      alignItems: 'flex-end',
    },
    statusText: {
      ...fontStyles.bold,
    },
    statusEnabled: {
      color: theme.colors.success.default,
    },
    statusLimited: {
      color: theme.colors.warning.default,
    },
    statusNotEnabled: {
      color: theme.colors.error.default,
    },
    balanceText: {
      color: theme.colors.text.default,
      marginTop: 2,
    },
    balanceToken: {
      color: theme.colors.text.alternative,
      marginTop: 1,
    },
  });

export default createStyles;
