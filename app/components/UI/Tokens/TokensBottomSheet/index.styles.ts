import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  return StyleSheet.create({
    // bottom sheet
    bottomSheetWrapper: {
      alignItems: 'flex-start',
    },
    bottomSheetTitle: {
      alignSelf: 'center',
      paddingTop: 16,
    },
    bottomSheetText: {
      width: '100%',
    },
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
    // tab
    tabBarContainer: {},
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
    networkMenu: {
      alignItems: 'center',
    },
    // custom network styles
    container: {
      flex: 1,
    },
    addNetworkButtonContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    addNetworkButton: {},
    iconContainer: {
      marginRight: 14,
    },
  });
};

export default createStyles;
