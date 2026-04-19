import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';
import {
  FlexDirection,
  JustifyContent,
} from '../../UI/Box/box.types';

export const getFontSizeForInputLength = (contentLength: number) => {
  if (contentLength <= 10) {
    return 60;
  }
  if (contentLength <= 12) {
    return 48;
  }
  if (contentLength <= 18) {
    return 32;
  }
  if (contentLength <= 24) {
    return 24;
  }
  if (contentLength <= 32) {
    return 18;
  }
  return 12;
};

export const styleSheet = (params: {
  theme: Theme;
  vars: { contentLength: number };
}) => {
  const {
    theme,
    vars: { contentLength },
  } = params;
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      flex: 1,
      flexDirection: FlexDirection.Column,
      justifyContent: JustifyContent.spaceBetween,
    },
    topSection: {
      flex: 1,
      alignContent: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    inputSection: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
      width: '100%',
    },
    inputWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    inputText: {
      fontSize: getFontSizeForInputLength(contentLength),
      lineHeight: 75,
      fontFamily: 'Geist-Medium',
    },
    continueButton: {
      marginHorizontal: 16,
      marginBottom: 8,
    },
  });
};
