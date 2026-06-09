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
    },
    listItem: {
      minHeight: 64,
      justifyContent: 'center',
      paddingVertical: 8,
    },
    icon: {
      width: 32,
      height: 32,
    },
    tokenIconStack: {
      width: 32,
      height: 32,
    },
    tokenIconStackBack: {
      position: 'absolute',
      left: 0,
      top: 0,
    } as ViewStyle,
    tokenIconStackFront: {
      position: 'absolute',
      right: 0,
      bottom: 0,
    } as ViewStyle,
    listItemContent: {
      alignItems: 'center',
      marginTop: 0,
      paddingTop: 0,
    },
    listItemBody: {
      flex: 1,
      minWidth: 0,
    },
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
  });

export type ActivityListItemRowStyles = ReturnType<typeof createStyles>;
