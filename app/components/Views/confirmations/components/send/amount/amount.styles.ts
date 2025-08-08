import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { FlexDirection, JustifyContent } from '../../../../../UI/Box/box.types';

export const styleSheet = (params: {
  theme: Theme;
  vars: { inputError: boolean };
}) => {
  const {
    theme,
    vars: { inputError },
  } = params;
  return StyleSheet.create({
    balanceSection: {
      alignSelf: 'center',
      marginTop: 140,
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
      marginTop: 32,
      minWidth: 100,
    },
    input: {
      borderWidth: 0,
      color: inputError
        ? theme.colors.error.default
        : theme.colors.text.default,
      height: 50,
      width: '100%',
    },
    inputSection: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.center,
    },
    inputWrapper: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.flexEnd,
      width: '45%',
    },
    tokenSymbol: {
      paddingLeft: 2,
      width: '40%',
    },
    topSection: {
      paddingHorizontal: 8,
      paddingVertical: 32,
    },
  });
};
