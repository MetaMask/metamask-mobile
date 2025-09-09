import { StyleSheet, Platform } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';

export const getFontSizeForInputLength = (
  inputLength: number,
  symbolLength: number,
) => {
  if (inputLength < 5 && symbolLength < 6) {
    return 60;
  }
  if (inputLength < 6 && symbolLength < 7) {
    return 48;
  }
  if (inputLength < 9 && symbolLength < 9) {
    return 32;
  }
  if (inputLength < 12 && symbolLength < 12) {
    return 24;
  }
  if (inputLength < 16 && symbolLength < 16) {
    return 18;
  }
  return 12;
};

export const styleSheet = (params: {
  theme: Theme;
  vars: {
    fiatMode: boolean;
    inputError: boolean;
    inputLength: number;
    isNFT: boolean;
    symbolLength: number;
  };
}) => {
  const {
    theme,
    vars: { fiatMode, inputError, inputLength, isNFT, symbolLength },
  } = params;
  return StyleSheet.create({
    balanceSection: {
      alignSelf: 'center',
      marginBottom: 40,
    },
    container: {
      backgroundColor: theme.colors.background.default,
      flexDirection: FlexDirection.Column,
      justifyContent: JustifyContent.spaceBetween,
      minHeight: '100%',
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
      fontSize: getFontSizeForInputLength(inputLength, symbolLength),
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: Platform.OS === 'ios' ? 0 : 2,
      // Dynamic height for large fonts:
      height: Math.max(
        50,
        getFontSizeForInputLength(inputLength, symbolLength) + 10,
      ),
    },
    inputSection: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
      marginTop: isNFT ? 0 : 80,
      width: '100%',
    },
    inputWrapper: {
      alignItems: AlignItems.center,
      flexDirection: FlexDirection.Row,
      justifyContent: fiatMode
        ? JustifyContent.flexStart
        : JustifyContent.flexEnd,
      width: '50%',
    },
    nftImage: { alignSelf: 'center', height: 100, width: 100 },
    nftImageWrapper: {
      alignItems: AlignItems.center,
      marginTop: 32,
      width: '100%',
    },
    tokenSymbolWrapper: {
      justifyContent: fiatMode
        ? JustifyContent.flexEnd
        : JustifyContent.flexStart,
      width: '50%',
    },
    tokenSymbol: {
      alignItems: AlignItems.center,
      alignSelf: fiatMode ? AlignItems.flexEnd : AlignItems.flexStart,
      fontSize: getFontSizeForInputLength(inputLength, symbolLength),
      lineHeight: 75,
      paddingLeft: 2,
    },
    topSection: {
      paddingHorizontal: 8,
      paddingVertical: 32,
    },
  });
};
