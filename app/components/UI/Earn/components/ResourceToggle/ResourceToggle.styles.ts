import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars?: { style?: any } }) => {
  const { theme, vars } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: Object.assign(
      {
        paddingHorizontal: 16,
        paddingTop: 12,
        marginBottom: 8,
      },
      vars?.style,
    ),
    group: {
      position: 'relative',
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: colors.background.alternative,
      borderRadius: 16,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border.muted,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    buttonWrapper: {
      flex: 1,
    },
    buttonBase: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    slider: {
      position: 'absolute',
      top: 4,
      left: 3,
      bottom: 4,
      borderRadius: 12,
      backgroundColor: colors.background.default,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
  });
};

export default styleSheet;