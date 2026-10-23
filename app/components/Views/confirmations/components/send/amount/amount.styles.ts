import { StyleSheet } from 'react-native';

import { getFontSizeForInputLength } from '../../../../../../component-library/components-temp/AnimatedAmountDisplay';
import { Theme } from '../../../../../../util/theme/models';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';

const SEND_LARGE_FONT_SIZE = 88;

/** Large amounts stay at 88px, with line height equal to the font size. Longer values keep the existing shrink curve. */
export const getSendAmountFontSize = (contentLength: number): number => {
  if (contentLength <= 10) {
    return SEND_LARGE_FONT_SIZE;
  }

  return Math.max(
    12,
    Math.round(
      (getFontSizeForInputLength(contentLength) * SEND_LARGE_FONT_SIZE) / 60,
    ),
  );
};

export const styleSheet = (params: {
  theme: Theme;
  vars: {
    inputFontSize: number;
  };
}) => {
  const {
    theme,
    vars: { inputFontSize },
  } = params;
  return StyleSheet.create({
    balanceText: {
      alignSelf: 'center',
      marginTop: 12,
    },
    container: {
      backgroundColor: theme.colors.background.default,
      flex: 1,
      flexDirection: FlexDirection.Column,
      justifyContent: JustifyContent.spaceBetween,
    },
    currencyTag: {
      alignSelf: 'center',
      marginTop: 16,
    },
    inputSection: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
      paddingHorizontal: 24,
      width: '100%',
    },
    inputText: {
      fontSize: inputFontSize,
      lineHeight: inputFontSize,
      fontFamily: 'GrotzecCond-Bold',
    },
    cursor: {
      width: 1,
      height: Math.round(inputFontSize * 0.95),
      backgroundColor: theme.colors.text.muted,
      transform: [{ translateY: Math.round(inputFontSize * -0.04) }],
    },
    inputWrapper: {
      alignItems: 'center',
      flexShrink: 1,
      justifyContent: 'center',
      flexDirection: 'row',
      maxWidth: '100%',
      width: '100%',
    },
    nftImage: { alignSelf: 'center', height: 100, width: 100 },
    nftImageWrapper: {
      alignItems: AlignItems.center,
      width: '100%',
    },
    tokenSymbolWrapper: {
      justifyContent: JustifyContent.flexStart,
      width: '50%',
    },
    topSection: {
      flex: 1,
      alignContent: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
  });
};
