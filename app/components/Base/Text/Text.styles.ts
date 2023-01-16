import { StyleSheet } from 'react-native';
import { scale } from 'react-native-size-matters';
import { fontStyles } from '../../../styles/common';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    text: {
      ...fontStyles.normal,
      color: colors.text.default,
      marginVertical: 2,
      fontSize: scale(14),
    },
    centered: {
      textAlign: 'center',
    },
    right: {
      textAlign: 'right',
    },
    red: {
      color: colors.error.default,
    },
    orange: {
      color: colors.secondary.default,
    },
    black: {
      color: colors.text.default,
    },
    bold: fontStyles.bold,
    blue: {
      color: colors.primary.default,
    },
    green: {
      color: colors.success.default,
    },
    grey: {
      color: colors.text.alternative,
    },
    primary: {
      color: colors.text.default,
    },
    muted: {
      color: colors.text.muted,
    },
    small: {
      fontSize: 12,
    },
    big: {
      fontSize: 16,
    },
    bigger: {
      fontSize: 18,
    },
    upper: {
      textTransform: 'uppercase',
    },
    disclaimer: {
      fontStyle: 'italic',
      letterSpacing: 0.15,
    },
    modal: {
      color: colors.text.default,
      fontSize: 16,
      lineHeight: 22.4, // 1.4 * fontSize
    },
    infoModal: {
      lineHeight: 20,
      marginVertical: 6,
    },
    link: {
      color: colors.primary.default,
    },
    strikethrough: {
      textDecorationLine: 'line-through',
    },
    underline: {
      textDecorationLine: 'underline',
    },
    noMargin: {
      marginVertical: 0,
    },
  });

export default createStyles;
