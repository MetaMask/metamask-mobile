import { Theme } from '../../../../util/theme/models';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  return StyleSheet.create({
    stakingEarningsContainer: {
      paddingTop: 16,
    },
    title: {
      ...typography.sHeadingSM,
      paddingBottom: 8,
    } as TextStyle,
    keyValueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
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
