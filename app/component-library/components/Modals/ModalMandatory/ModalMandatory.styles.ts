// Third party dependencies.
import { StyleSheet, Dimensions, TextStyle, Platform } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import { getFontFamily, TextVariant } from '../../Texts/Text';
import { typography } from '@metamask/design-tokens';

const screenHeight = Dimensions.get('window').height;
/**
 * Style sheet function for ModalConfirmation component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: {
      justifyContent: 'center',
    },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      padding: 0,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    headerContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 16,
    },
    headerText: {
      color: colors.text.default,
      ...(typography.sHeadingMD as TextStyle),
      fontFamily: getFontFamily(TextVariant.HeadingMD),
      textAlign: 'center',
      marginBottom: 16,
    },
    headerEmpty: {
      width: 32,
      height: 32,
    },
    bodyContainer: { height: screenHeight / 2, padding: 0 },
    checkboxContainer: {
      flexDirection: 'row',
      marginTop: 16,
      columnGap: 8,
      marginRight: 16,
      width: '90%',
      borderTopWidth: 1,
      borderColor: colors.border.muted,
      paddingTop: 16,
    },
    checkboxText: {
      marginLeft: 8,
      flex: 1,
      color: colors.text.default,
      ...(typography.sBodyMDBold as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
    },
    confirmButton: {
      marginTop: 16,
      width: '100%',
    },
    scrollToEndButton: {
      width: 40,
      height: 40,
      borderRadius: 40 / 2,
      backgroundColor: colors.icon.default,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      position: 'absolute',
      bottom: 160,
      right: 16,
      boxShadow: `0px 3px 8px ${colors.icon.default}`,
    },
    footerHelpText: {
      marginTop: 16,
      textAlign: 'center',
      color: colors.text.alternative,
      ...(typography.sBodySM as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodySM),
      marginBottom: Platform.select({
        ios: 8,
        macos: 8,
        default: 16,
      }),
    },
  });
};

export default styleSheet;
