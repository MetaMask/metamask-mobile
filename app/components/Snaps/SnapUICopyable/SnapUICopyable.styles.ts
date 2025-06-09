// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for SnapUICopyable component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
interface StyleSheetParams {
  theme: Theme;
  vars: {
    sensitive: boolean;
    isVisible: boolean;
  };
}

const styleSheet = (params: StyleSheetParams) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { sensitive, isVisible } = vars;

  return StyleSheet.create({
    containerWrapper: {
      width: '100%',
    },
    container: {
      backgroundColor:
        isVisible && sensitive ? colors.error.muted : colors.background.muted,
      paddingHorizontal: 10,
      paddingVertical: 12,
      borderRadius: 8,
      alignSelf: 'flex-start',
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      width: '100%',
      position: 'relative',
    },
    content: {
      flex: 1,
      width: '100%',
      flexDirection: 'column',
    },
    revealText: {
      color: colors.text.alternative,
    },
    text: {
      color:
        isVisible && !sensitive
          ? colors.text.alternative
          : colors.error.default,
      flex: 1,
    },
    icon: {
      color:
        isVisible && sensitive ? colors.error.default : colors.text.alternative,
    },
    background: {
      backgroundColor:
        isVisible && sensitive ? colors.error.muted : colors.background.muted,
    },
    moreButton: {
      alignSelf: 'flex-end',
      position: 'absolute',
      bottom: 12,
      right: 10,
    },
    moreButtonText: {
      color: colors.primary.default,
    },
  });
};

export default styleSheet;
