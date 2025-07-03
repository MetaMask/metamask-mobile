import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import Device from '../../../../../util/device';

const getIosBottomPadding = (
  isStakingConfirmationBool: boolean,
<<<<<<< HEAD
  isFullScreenConfirmation: boolean,
=======
  isStandaloneConfirmation: boolean,
>>>>>>> stable
) => {
  if (isStakingConfirmationBool) {
    return 16;
  }
<<<<<<< HEAD
  return isFullScreenConfirmation ? 32 : 8;
=======
  return isStandaloneConfirmation ? 32 : 8;
>>>>>>> stable
};

const getAndroidBottomPadding = (
  isStakingConfirmationBool: boolean,
<<<<<<< HEAD
  isFullScreenConfirmation: boolean,
=======
  isStandaloneConfirmation: boolean,
>>>>>>> stable
) => {
  if (isStakingConfirmationBool) {
    return 36;
  }
<<<<<<< HEAD
  return isFullScreenConfirmation ? 42 : 28;
=======
  return isStandaloneConfirmation ? 42 : 28;
>>>>>>> stable
};

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isStakingConfirmationBool: boolean;
<<<<<<< HEAD
    isFullScreenConfirmation: boolean;
=======
    isStandaloneConfirmation: boolean;
>>>>>>> stable
  };
}) => {
  const {
    theme: { colors },
<<<<<<< HEAD
    vars: { isStakingConfirmationBool, isFullScreenConfirmation },
  } = params;

  const basePaddingBottom = Device.isIos()
    ? getIosBottomPadding(isStakingConfirmationBool, isFullScreenConfirmation)
    : getAndroidBottomPadding(
        isStakingConfirmationBool,
        isFullScreenConfirmation,
=======
    vars: { isStakingConfirmationBool, isStandaloneConfirmation },
  } = params;

  const basePaddingBottom = Device.isIos()
    ? getIosBottomPadding(isStakingConfirmationBool, isStandaloneConfirmation)
    : getAndroidBottomPadding(
        isStakingConfirmationBool,
        isStandaloneConfirmation,
>>>>>>> stable
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
