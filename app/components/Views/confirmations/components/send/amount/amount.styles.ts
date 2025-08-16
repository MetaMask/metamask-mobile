import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';

// todo-changes these ranges once values are provided by design team
const getFontSizeForInputLength = (inputLength: number) => {
  if (inputLength > 20) {
    return 10;
  }
  if (inputLength > 15) {
    return 15;
  }
  if (inputLength > 10) {
    return 25;
  }
  if (inputLength > 5) {
    return 40;
  }
  return 60;
};

export const styleSheet = (params: {
  theme: Theme;
  vars: { inputError: boolean; inputLength: number; isNFT: boolean };
}) => {
  const {
    theme,
    vars: { inputError, inputLength, isNFT },
  } = params;
  return StyleSheet.create({
    balanceSection: {
      alignSelf: 'center',
      marginTop: isNFT ? 120 : 140,
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
      height: 50,
      fontSize: getFontSizeForInputLength(inputLength),
      width: '100%',
    },
    inputSection: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
      marginTop: isNFT ? 0 : 100,
    },
    inputWrapper: {
      alignItems: AlignItems.center,
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.flexEnd,
      width: '45%',
    },
    nftImage: { alignSelf: 'center', height: 100, width: 100 },
    nftImageWrapper: {
      alignItems: AlignItems.center,
      marginTop: 32,
      width: '100%',
    },
    tokenSymbol: {
      alignItems: AlignItems.center,
      fontSize: getFontSizeForInputLength(inputLength),
      lineHeight: 75,
      paddingLeft: 2,
      textAlign: 'left',
      width: '40%',
    },
    topSection: {
      paddingHorizontal: 8,
      paddingVertical: 32,
    },
  });
};
