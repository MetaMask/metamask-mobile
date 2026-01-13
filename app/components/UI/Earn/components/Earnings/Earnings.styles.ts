import { StyleSheet, TextStyle } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    hitSlop: {
      top: 15,
      bottom: 15,
      left: 15,
      right: 15,
    },
    earningsContainer: {
      paddingTop: 16,
    },
    title: {
      paddingBottom: 8,
    } as TextStyle,
    keyValueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    keyValuePrimaryTextWrapper: {
      flexDirection: 'row',
    },
    keyValuePrimaryTextWrapperCentered: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    keyValuePrimaryText: {
      color: colors.text.alternative,
    },
    keyValueSecondaryText: {
      alignItems: 'flex-end',
    },
  });
};

export default styleSheet;
