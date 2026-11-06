import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, type TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

/**
 * The Browser autocomplete row metrics (`UrlAutocomplete/styles.ts`), so a
 * Predict result lines up with the Sites, Tokens and Perps rows around it.
 */
const styleSheet = ({ theme: { colors, typography } }: { theme: Theme }) =>
  StyleSheet.create({
    item: {
      paddingVertical: 8,
      marginBottom: 8,
    },
    itemWrapper: {
      flexDirection: 'row',
      paddingHorizontal: 16,
    },
    icon: {
      width: 26,
      height: 26,
      marginRight: 7,
      borderRadius: 13,
    },
    textContent: {
      flex: 1,
      marginLeft: 10,
    },
    title: {
      color: colors.text.default,
      ...typography.sBodyMDMedium,
      fontFamily: getFontFamily(TextVariant.BodyMDMedium),
    } as TextStyle,
    subtitle: {
      color: colors.text.alternative,
      ...typography.sBodySM,
      fontFamily: getFontFamily(TextVariant.BodySM),
    } as TextStyle,
  });

export default styleSheet;
