import { ImageStyle, StyleSheet, TextStyle } from 'react-native';
import { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
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
      borderBottomWidth: 1,
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
      width: 40,
      height: 40,
    } as ImageStyle,
    summaryWrapper: {
      padding: 15,
    },
    fromDeviceText: {
      color: colors.text.alternative,
      fontSize: 14,
      marginBottom: 10,
      ...fontStyles.normal,
    },
    importText: {
      color: colors.text.alternative,
      fontSize: 14,
      ...fontStyles.bold,
      alignContent: 'center',
    },
    importRowBody: {
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      paddingTop: 10,
    },
    listItemDate: {
      ...(typography.sBodyXSMedium as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyXSMedium),
      color: colors.text.alternative,
      marginVertical: 0,
      marginBottom: 8,
      paddingBottom: 0,
    },
    listItemContent: {
      alignItems: 'center',
      marginTop: 0,
      paddingTop: 0,
    },
    listItemBody: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      marginRight: 16,
    },
    listItemTitle: {
      ...typography.sBodyLGMedium,
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginVertical: 0,
      marginTop: 0,
    },
    listItemStatus: {
      ...(typography.sBodySMMedium as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodySMMedium),
      marginVertical: 0,
      marginTop: 0,
    },
    listItemFiatAmount: {
      ...(typography.sBodyLGMedium as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginTop: 0,
    },
    listItemAmount: {
      ...(typography.sBodySMMedium as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodySMMedium),
      color: colors.text.alternative,
      flexShrink: 0,
    },
    itemContainer: {
      padding: 0,
      borderBottomWidth: 1,
    },
    typeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeIcon: {
      marginRight: 8,
    },
    typeText: {
      fontSize: 16,
      fontWeight: '600',
    },
    statusText: {
      fontSize: 12,
    },
    addressText: {
      fontSize: 14,
    },
    amountText: {
      fontSize: 16,
      fontWeight: '600',
    },
    dateText: {
      fontSize: 12,
    },
    feeContainer: {
      marginTop: 4,
    },
    feeText: {
      fontSize: 12,
    },
  });

export default createStyles;
