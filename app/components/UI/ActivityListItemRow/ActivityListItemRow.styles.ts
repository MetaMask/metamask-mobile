import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../../../util/theme';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

export const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) =>
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
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 8,
      paddingBottom: 8,
    },
    icon: {
      width: 32,
      height: 32,
    },
    tokenIconStack: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    tokenIconStackBack: {
      width: 16,
      height: 32,
      overflow: 'hidden',
    } as ViewStyle,
    tokenIconStackFront: {
      width: 16,
      height: 32,
      overflow: 'hidden',
    } as ViewStyle,
    tokenIconStackFrontImage: {
      position: 'absolute',
      left: -16,
      top: 0,
    } as ViewStyle,
    tokenIconStackDivider: {
      position: 'absolute',
      left: 15,
      top: 0,
      width: 1,
      height: 32,
      backgroundColor: colors.text.default,
    } as ViewStyle,
    listItemTitle: {
      ...typography.sBodyMDMedium,
      fontFamily: getFontFamily(TextVariant.BodyMDMedium),
      lineHeight: 18,
      marginTop: 0,
      color: colors.text.default,
    } as TextStyle,
    listItemTitleFailed: {
      color: colors.error.default,
    } as TextStyle,
    subtitleText: {
      ...typography.sBodySM,
      fontFamily: getFontFamily(TextVariant.BodySM),
      lineHeight: 16,
      marginTop: 0,
      color: colors.text.alternative,
    } as TextStyle,
    listItemAmounts: {
      alignItems: 'flex-end',
      flexShrink: 1,
      maxWidth: '45%',
      minWidth: 0,
    },
    listItemAmount: {
      ...typography.sBodyMDMedium,
      fontFamily: getFontFamily(TextVariant.BodyMDMedium),
      color: colors.text.default,
      lineHeight: 18,
      textAlign: 'right',
    } as TextStyle,
    listItemAmountIncoming: {
      color: colors.success.default,
    } as TextStyle,
    listItemSecondaryAmount: {
      ...typography.sBodySM,
      fontFamily: getFontFamily(TextVariant.BodySM),
      color: colors.text.alternative,
      lineHeight: 16,
      textAlign: 'right',
    } as TextStyle,
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleSpinner: {
      marginLeft: 6,
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
      marginRight: 4,
    },
    statusText: {
      marginTop: 0,
    } as TextStyle,
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
