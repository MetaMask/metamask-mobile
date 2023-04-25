import { StyleSheet } from 'react-native';

import Device from '../../../../util/device';
import { fontStyles } from '../../../../styles/common';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: Device.isIphoneX() ? 48 : 24,
      backgroundColor: colors.background.default,
      borderTopRightRadius: 20,
      borderTopLeftRadius: 20,
    },
    sectionExplanationText: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.alternative,
      marginVertical: 6,
    },
    option: {
      flexDirection: 'row',
      marginVertical: 8,
    },
    errorMessageWrapper: {
      marginVertical: 6,
    },
    optionText: {
      ...fontStyles.normal,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.default,
    },
    touchableOption: {
      flexDirection: 'row',
    },
    selectedCircle: {
      width: 8,
      height: 8,
      borderRadius: 8 / 2,
      margin: 3,
      backgroundColor: colors.primary.default,
    },
    outSelectedCircle: {
      width: 18,
      height: 18,
      borderRadius: 18 / 2,
      borderWidth: 2,
      borderColor: colors.primary.default,
    },
    circle: {
      width: 18,
      height: 18,
      borderRadius: 18 / 2,
      backgroundColor: colors.background.default,
      opacity: 1,
      borderWidth: 2,
      borderColor: colors.border.default,
    },
    input: {
      padding: 12,
      borderColor: colors.border.default,
      borderRadius: 10,
      borderWidth: 2,
      color: colors.text.default,
    },
    spendLimitContent: {
      marginLeft: 8,
      flex: 1,
    },
    spendLimitTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    spendLimitSubtitle: {
      ...fontStyles.normal,
      fontSize: 12,
      lineHeight: 18,
      color: colors.text.alternative,
    },
    textBlue: {
      color: colors.primary.default,
    },
    textBlack: {
      color: colors.text.default,
    },
  });

export default createStyles;
