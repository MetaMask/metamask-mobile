import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';

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
      marginTop: 8,
    },
    container: {
      backgroundColor: theme.colors.background.default,
      flex: 1,
      flexDirection: FlexDirection.Column,
      justifyContent: JustifyContent.spaceBetween,
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
    },
    cursor: {
      marginHorizontal: 0,
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
