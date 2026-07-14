import { StyleSheet } from 'react-native';
import { AppThemeKey, Theme } from '../../../../../../util/theme/models';
import { isPureBlackEnabled } from '../../../../../../util/theme/themeUtils';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const isPureBlackDark =
    isPureBlackEnabled && theme.themeAppearance === AppThemeKey.dark;

  return StyleSheet.create({
    container: {
      width: '100%',
    },
    optionWrapper: {
      position: 'relative',
      marginBottom: 8,
    },
    selectionIndicator: {
      position: 'absolute',
      left: 4,
      top: 4,
      bottom: 4,
      width: 4,
      backgroundColor: theme.colors.primary.default,
      zIndex: 1,
      borderRadius: 2,
    },
    optionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    // TODO(Pure Black): Remove isPureBlackDark guard once selection uses MMDS tokens.
    // Keep the left-edge indicator only; primary.muted band clashes on pure black sheets.
    selectedOption: isPureBlackDark
      ? {}
      : {
          backgroundColor: theme.colors.primary.muted,
        },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    optionTextContainer: {
      justifyContent: 'center',
    },
    optionName: {},
    estimatedTime: {
      color: theme.colors.text.alternative,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    valueInFiat: {},
    value: {
      color: theme.colors.text.alternative,
    },
  });
};

export default styleSheet;
