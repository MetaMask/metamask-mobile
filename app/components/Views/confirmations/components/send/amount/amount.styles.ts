import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';

export const getFontSizeForInputLength = (contentLength: number) => {
  if (contentLength <= 10) return 60;

  if (contentLength <= 18) {
    return Math.round(60 - (contentLength - 10) * 3.5);
  }

  return Math.max(14, Math.round(32 - (contentLength - 18) * 1.5));
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
      marginTop: 16,
    },
    container: {
      backgroundColor: theme.colors.background.default,
      flex: 1,
      flexDirection: FlexDirection.Column,
      justifyContent: JustifyContent.spaceBetween,
    },
    currencyTag: {
      alignSelf: 'center',
      backgroundColor: theme.colors.background.section,
      color: theme.colors.text.alternative,
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
      marginTop: 8,
      minWidth: 100,
    },
    inputSection: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
      paddingHorizontal: 24,
      width: '100%',
    },
    inputText: {
      fontSize: inputFontSize,
      lineHeight: 75,
      fontFamily: 'Inter-Medium',
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
