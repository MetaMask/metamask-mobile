import { StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../../util/theme';

export const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.background.default,
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
    },
    listItem: {
      minHeight: 64,
      width: '100%',
      justifyContent: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    icon: {
      width: 40,
      height: 40,
    },
    tokenIconStack: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    tokenIconStackBack: {
      width: 20,
      height: 40,
      overflow: 'hidden',
    } as ViewStyle,
    tokenIconStackFront: {
      width: 20,
      height: 40,
      overflow: 'hidden',
    } as ViewStyle,
    tokenIconStackFrontImage: {
      position: 'absolute',
      left: -20,
      top: 0,
    } as ViewStyle,
    tokenIconStackDivider: {
      position: 'absolute',
      left: 19,
      top: 0,
      width: 1,
      height: 40,
      backgroundColor: colors.text.default,
    } as ViewStyle,
    listItemAmounts: {
      alignItems: 'flex-end',
      flexShrink: 1,
      maxWidth: '45%',
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleSpinner: {
      height: 18,
      justifyContent: 'center',
      marginLeft: 6,
      transform: [{ translateY: -2 }],
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 0,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 0,
    },
    subtitleLeadingIcon: {
      height: 16,
      justifyContent: 'center',
      marginRight: 4,
      transform: [{ translateY: -1 }],
    },
    pendingActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingTop: 4,
      paddingBottom: 8,
    },
    actionContainerStyle: {
      height: 25,
      padding: 0,
    },
    speedupActionContainerStyle: {
      marginRight: 10,
    },
    actionStyle: {
      fontSize: 10,
      padding: 0,
      paddingHorizontal: 10,
    },
  });

export type ActivityListItemRowStyles = ReturnType<typeof createStyles>;
