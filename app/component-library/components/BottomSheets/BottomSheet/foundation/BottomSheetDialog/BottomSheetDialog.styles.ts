// Third party dependencies.
// eslint-disable-next-line @typescript-eslint/no-shadow
import { Platform, StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  BottomSheetDialogStyleSheetVars,
  BottomSheetDialogContainerVariant,
} from './BottomSheetDialog.types';

/**
 * Style sheet function for BottomSheetDialog component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BottomSheetDialogStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors, shadows } = theme;
  const {
    isFullscreen,
    maxSheetHeight,
    screenBottomPadding,
    style,
    containerVariant,
    screenWidth,
  } = vars;

  // Get border radius styles based on container variant
  const getBorderRadiusStyles = () => {
    switch (containerVariant) {
      case BottomSheetDialogContainerVariant.Trade:
        // Trade variant: no border radius, SVG handles the shape
        return {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderWidth: 0,
        };
      case BottomSheetDialogContainerVariant.Default:
      default:
        return {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        };
    }
  };

  return StyleSheet.create({
    base: Object.assign({
      position: 'absolute',
      bottom:
        containerVariant === BottomSheetDialogContainerVariant.Trade ? 47 : 0,
      left: 0,
      right: 0,
    } as ViewStyle) as ViewStyle,
    sheet: Object.assign(
      {
        backgroundColor: colors.background.default,
        ...getBorderRadiusStyles(),
        maxHeight: maxSheetHeight,
        overflow: 'hidden',
        paddingBottom: Platform.select({
          ios: screenBottomPadding,
          macos: screenBottomPadding,
          default: screenBottomPadding + 16,
        }),
        borderWidth: 1,
        borderColor: colors.border.muted,
        ...(isFullscreen && { height: maxSheetHeight }),
        ...shadows.size.lg,
      },
      style,
    ) as ViewStyle,
    notchWrapper: {
      alignSelf: 'stretch',
      padding: 4,
      alignItems: 'center',
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
    },
    floatingButton: {
      position: 'absolute',
      bottom: -7.5, // Position in the concave dent
      left: screenWidth / 2 - 22.5 - 1,
      width: 45,
      height: 45,
      borderRadius: 22.5,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.size.md,
    },
    tradeSvgContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    tradeContentContainer: {
      position: 'relative',
      zIndex: 1,
      paddingBottom: 60,
    },
    tradeSheetContainer: {
      backgroundColor: 'transparent',
      overflow: 'visible',
      borderWidth: 0,
      borderColor: 'transparent',
    },
    tradeDentSvg: {
      position: 'absolute',
      top: -30,
      left: 0,
    },
    tradeSheetSvg: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    tradeContentWithPadding: {
      position: 'relative',
      zIndex: 1,
      paddingBottom: 40,
    },
  });
};

export default styleSheet;
