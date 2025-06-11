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
      justifyContent: 'flex-start',
      // marginLeft: 20,
      alignSelf: 'flex-start',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    percentageChange: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
      alignContent: 'flex-start',
      paddingLeft: 16,
    },
    title: {
      paddingVertical: 4,
      paddingHorizontal: 15,
    } as TextStyle,
    base: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      alignContent: 'flex-start',
      justifyContent: 'space-between',
    },
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
