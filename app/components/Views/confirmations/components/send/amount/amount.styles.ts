import { StyleSheet, Platform } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';

export const getFontSizeForInputLength = (contentLength: number) => {
  if (contentLength < 10) {
    return 60;
  }
  if (contentLength < 12) {
    return 48;
  }
  if (contentLength < 18) {
    return 32;
  }
  if (contentLength < 24) {
    return 24;
  }
  return 18;
};

export const styleSheet = (params: {
  theme: Theme;
  vars: {
    inputError: boolean;
    inputLength: number;
    isNFT: boolean;
    symbolLength: number;
  };
}) => {
  const {
    theme,
    vars: { inputError, inputLength, isNFT, symbolLength },
  } = params;
  return StyleSheet.create({
    balanceSection: {
      alignSelf: 'center',
      marginTop: isNFT ? 100 : 132,
    },
    container: {
      backgroundColor: theme.colors.background.default,
      flexDirection: FlexDirection.Column,
      justifyContent: JustifyContent.spaceBetween,
      height: '100%',
    },
    currencyTag: {
      alignSelf: 'center',
      backgroundColor: theme.colors.background.alternative,
      color: theme.colors.text.alternative,
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
      marginTop: 8,
      minWidth: 100,
    },
    input: {
      alignItems: AlignItems.center,
      borderWidth: 0,
      color: inputError
        ? theme.colors.error.default
        : theme.colors.text.default,
      fontSize: getFontSizeForInputLength(inputLength + symbolLength),
      minWidth: '30%',
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: Platform.OS === 'ios' ? 0 : 2,
      // Dynamic height for large fonts:
      height: Math.max(
        50,
        getFontSizeForInputLength(inputLength + symbolLength) + 10,
      ),
    },
    inputSection: {
      flexDirection: FlexDirection.Row,
      justifyContent:
        inputLength < 5 ? JustifyContent.center : JustifyContent.flexEnd,
      marginTop: isNFT ? 0 : 80,
      width: '100%',
    },
    inputWrapper: {
      alignItems: AlignItems.center,
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.flexEnd,
    },
    nftImage: { alignSelf: 'center', height: 100, width: 100 },
    nftImageWrapper: {
      alignItems: AlignItems.center,
      marginTop: 32,
      width: '100%',
    },
    tokenSymbol: {
      alignItems: AlignItems.center,
      alignSelf: 'flex-end',
      fontSize: getFontSizeForInputLength(inputLength + symbolLength),
      lineHeight: 75,
      paddingLeft: 2,
      textAlign: 'left',
    },
    topSection: {
      paddingHorizontal: 8,
      paddingVertical: 32,
    },
  });
};
