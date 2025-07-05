import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { Theme } from '../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  return StyleSheet.create({
    // reusable modal
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    notch: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      marginTop: 8,
      alignSelf: 'center',
    },
    // network tabs selectors
    networkTabsSelectorWrapper: {
      height: '100%',
    },
    networkTabsSelectorTitle: {
      alignSelf: 'center',
      paddingTop: 16,
      marginTop: 4,
    },
    // tab
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.text.default,
    },
    inactiveUnderlineStyle: {
      height: 2,
      backgroundColor: colors.text.alternative,
    },
    tabStyle: {
      paddingBottom: 8,
      paddingVertical: 8,
    },
    textStyle: {
      ...(typography.sBodyMD as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMD),
      fontWeight: '500',
    },
    tabBar: {
      borderColor: colors.border.muted,
      marginBottom: 8,
    },
    // edit network menu
    editNetworkMenu: {
      alignItems: 'center',
    },
    // custom network styles
    containerDeleteText: {
      paddingLeft: 16,
      paddingRight: 8,
      alignItems: 'center',
    },
    textCentred: {
      textAlign: 'center',
    },
  });
};

export default createStyles;
