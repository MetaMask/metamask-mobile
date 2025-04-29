import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import Device from '../../../../../util/device';

const getIosBottomPadding = (
  isStakingConfirmationBool: boolean,
  isStandaloneConfirmation: boolean,
) => {
  if (isStakingConfirmationBool) {
    return 16;
  }
  return isStandaloneConfirmation ? 32 : 8;
};

const getAndroidBottomPadding = (
  isStakingConfirmationBool: boolean,
  isStandaloneConfirmation: boolean,
) => {
  if (isStakingConfirmationBool) {
    return 36;
  }
  return isStandaloneConfirmation ? 42 : 28;
};

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isStakingConfirmationBool: boolean;
    isStandaloneConfirmation: boolean;
  };
}) => {
  const {
    theme: { colors },
    vars: { isStakingConfirmationBool, isStandaloneConfirmation },
  } = params;

  const basePaddingBottom = Device.isIos()
    ? getIosBottomPadding(isStakingConfirmationBool, isStandaloneConfirmation)
    : getAndroidBottomPadding(
        isStakingConfirmationBool,
        isStandaloneConfirmation,
      );

  return StyleSheet.create({
    base: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: basePaddingBottom,
    },
    linkText: {
      textDecorationLine: 'underline',
    },
    bottomTextContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      marginBottom: 12,
    },
    bottomTextContainerLine: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
  });
};

export default styleSheet;
