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
      width: 32,
      height: 32,
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
    },
    listItemStatus: {
      ...(typography.sBodyMDBold as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
    },
    listItemFiatAmount: {
      ...(typography.sBodyLGMedium as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginTop: 0,
    },
    listItemAmount: {
      ...(typography.sBodyMD as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.text.alternative,
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
