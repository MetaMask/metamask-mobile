import { typography } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
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
    assetName: {
      ...typography.sBodySMMedium,
      fontFamily: getFontFamily(TextVariant.BodySMMedium),
      fontSize: 14,
      lineHeight: 20,
    } as TextStyle,
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    bannerStyles: {
      marginVertical: 8,
    },
    buttonsContainer: {
      paddingTop: 8,
    },
    stakingCta: {
      paddingBottom: 8,
    },
  });

export default styleSheet;
