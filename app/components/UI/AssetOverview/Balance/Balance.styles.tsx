import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;
  return StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
      alignSelf: 'center',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    title: {
      paddingVertical: 4,
      paddingHorizontal: 15,
    } as TextStyle,
    text: {
      ...typography.sBodySM,
      fontFamily: getFontFamily(TextVariant.BodySM),
      marginVertical: 0,
    } as TextStyle,
    fiatBalance: {
      ...typography.sHeadingMD,
      fontFamily: getFontFamily(TextVariant.HeadingMD),
    } as TextStyle,
  });
};

export default styleSheet;
