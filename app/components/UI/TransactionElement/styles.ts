import { StyleSheet, type TextStyle } from 'react-native';
import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
import { fontStyles } from '../../../styles/common';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    rowWithBorder: {
      backgroundColor: colors.background.default,
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
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
    icon: {
      width: 32,
      height: 32,
    },
    iconBadgePosition: {
      bottom: -4,
      right: -4,
    },
    importText: {
      color: colors.text.alternative,
      fontSize: 14,
      ...fontStyles.bold,
      alignContent: 'center',
    },
    importRowBody: {
      alignItems: 'center',
      paddingTop: 10,
    },
    listItemDate: {
      marginBottom: 10,
      paddingBottom: 0,
    },
    listItemContent: {
      alignItems: 'flex-start',
      marginTop: 0,
      paddingTop: 0,
    },
    listItemTitle: {
      ...typography.sBodyLGMedium,
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginTop: 0,
    } as TextStyle,
    listItemStatus: {
      ...typography.sBodyMDBold,
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
    } as TextStyle,
    listItemFiatAmount: {
      ...typography.sBodyLGMedium,
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginTop: 0,
    } as TextStyle,
    listItemAmount: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.text.alternative,
    } as TextStyle,
  });

export type TransactionElementStyles = ReturnType<typeof createStyles>;

export default createStyles;
