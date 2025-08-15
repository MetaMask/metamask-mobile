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
      paddingHorizontal: 16,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    ethLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
    },
    percentageChange: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
      alignContent: 'flex-start',
      paddingLeft: 16,
    },
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
