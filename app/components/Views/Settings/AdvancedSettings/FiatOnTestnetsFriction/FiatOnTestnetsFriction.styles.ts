import { StyleSheet, TextStyle } from 'react-native';
import { typography } from '@metamask/design-tokens';
import {
  getFontFamily,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

export default () =>
  StyleSheet.create({
    frictionContainer: {
      alignItems: 'center',
      padding: 16,
      alignSelf: 'center',
    },
    heading: {
      ...(typography.sHeadingMD as TextStyle),
      fontFamily: getFontFamily(TextVariant.HeadingMD),
    },
    descriptionText: {
      marginTop: 16,
    },
    buttonsContainer: {
      marginTop: 32,
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      gap: 16,
    },
    button: {
      flex: 1,
    },
  });
