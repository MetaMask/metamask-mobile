/* eslint-disable import/prefer-default-export */
import { StyleSheet, TextStyle } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

export type NotificationListStyles = ReturnType<typeof createStyles>;

export const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      marginHorizontal: 8,
    },
    wrapper: {
      flex: 1,
      paddingVertical: 10,
      justifyContent: 'center',
      borderRadius: 10,
    },
    loaderContainer: {
      position: 'absolute',
      zIndex: 999,
      width: '100%',
      height: '100%',
    },

    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabStyle: {
      paddingBottom: 0,
      paddingVertical: 8,
    },
    tabBar: {
      borderColor: colors.background.default,
    },
    textStyle: {
      ...(typography.sBodyMD as TextStyle),
      fontWeight: '500',
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    TabWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    list: { flexGrow: 1 },
    fox: {
      width: 20,
      height: 20,
    },
    badgeWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      position: 'absolute',
      top: '10%',
    },
    circleLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    circleLogoPlaceholder: {
      backgroundColor: colors.background.alternative,
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    squareLogo: {
      width: 32,
      height: 32,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    squareLogoPlaceholder: {
      backgroundColor: colors.background.alternative,
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    rowContainer: { flex: 1, marginLeft: 42, alignItem: 'center' },
    rowInsider: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    foxWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      position: 'absolute',
      top: '25%',
    },
    textBox: {
      flexShrink: 1,
      maxWidth: '85%',
    },
    button: {
      marginTop: 16,
      width: '100%',
      alignSelf: 'center',
    },
    trashIconContainer: {
      position: 'absolute',
      paddingHorizontal: 24,
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background.hover,
      justifyContent: 'flex-end',
      alignItems: 'center',
      overflow: 'hidden',
      height: '100%',
      right: 0,
      left: 0,
      zIndex: -1,
    },
  });
