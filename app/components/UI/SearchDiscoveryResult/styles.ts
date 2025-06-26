import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const styleSheet = ({ theme: { colors, typography } }: { theme: Theme }) =>
  StyleSheet.create({
    bookmarkIco: {
      width: 40,
      height: 40,
      marginRight: 7,
      borderRadius: 20,
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
    categoryWrapper: {
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    categoryTitle: {
      color: colors.text.alternative,
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
    } as TextStyle,
    item: {
      paddingVertical: 8,
      marginBottom: 8,
    },
    itemWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
    },
    textContent: {
      flex: 1,
      marginLeft: 10,
    },
    resultActionButton: {
      marginLeft: 10,
      backgroundColor: colors.background.muted,
    },
    hiddenButton: {
      opacity: 0,
    },
    loadingButton: {
      opacity: 0.5,
    },
    priceContainer: {
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    price: {
      color: colors.text.default,
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
    } as TextStyle,
  });

export default styleSheet;
