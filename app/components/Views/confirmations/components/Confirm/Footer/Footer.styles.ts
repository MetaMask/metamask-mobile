import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { confirmDisabled: boolean; isStakingConfirmation: boolean };
}) => {
  const {
    theme,
    vars: { confirmDisabled, isStakingConfirmation },
  } = params;

  return StyleSheet.create({
    rejectButton: {
      flex: 1,
    },
    confirmButton: {
      flex: 1,
      opacity: confirmDisabled ? 0.5 : 1,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingTop: 16,
      paddingBottom: isStakingConfirmation ? 6 : 16,
    },
    buttonDivider: {
      width: 8,
    },
    linkText: {
      textDecorationLine: 'underline',
    },
    textContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: 24,
    },
  });
};

export default styleSheet;
