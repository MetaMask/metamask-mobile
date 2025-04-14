import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const styleSheet = ({ theme: { colors, typography } }: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background.default,
      // Hidden by default
      display: 'none',
      paddingTop: 8,
    },
    contentContainer: {
      paddingVertical: 15,
    },
    categoryWrapper: {
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    category: {
      color: colors.text.default,
      backgroundColor: colors.background.default,
      marginRight: 10,
      ...typography.lHeadingSM,
      fontFamily: getFontFamily(TextVariant.HeadingSM),
    } as TextStyle,
    bookmarkIco: {
      width: 26,
      height: 26,
      marginRight: 7,
      borderRadius: 13,
    },
    fallbackTextStyle: {
      fontSize: 12,
    },
    name: {
      color: colors.text.default,
      ...typography.sBodyMDMedium,
      fontFamily: getFontFamily(TextVariant.BodyMDMedium),
    } as TextStyle,
    url: {
      color: colors.text.alternative,
      ...typography.sBodySM,
      fontFamily: getFontFamily(TextVariant.BodySM),
    } as TextStyle,
    item: {
      paddingVertical: 8,
      marginBottom: 8,
    },
    itemWrapper: {
      flexDirection: 'row',
      paddingHorizontal: 15,
    },
    textContent: {
      flex: 1,
      marginLeft: 10,
    },
    bg: {
      flex: 1,
    },
    resultActionButton: {
      marginLeft: 10,
    },
    hiddenButton: {
      opacity: 0,
    },
    priceContainer: {
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    price: {
      color: colors.text.default,
    }
  });

export default styleSheet;
