import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import Device from '../../../../../util/device';

const getIosBottomPadding = (
  isStakingConfirmationBool: boolean,
  isFullScreenConfirmation: boolean,
) => {
  if (isStakingConfirmationBool) {
    return 16;
  }
  return isFullScreenConfirmation ? 32 : 8;
};

const getAndroidBottomPadding = (
  isStakingConfirmationBool: boolean,
  isFullScreenConfirmation: boolean,
) => {
  if (isStakingConfirmationBool) {
    return 36;
  }
  return isFullScreenConfirmation ? 42 : 28;
};

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isStakingConfirmationBool: boolean;
    isFullScreenConfirmation: boolean;
  };
}) => {
  const {
    theme: { colors },
    vars: { isStakingConfirmationBool, isFullScreenConfirmation },
  } = params;

  const basePaddingBottom = Device.isIos()
    ? getIosBottomPadding(isStakingConfirmationBool, isFullScreenConfirmation)
    : getAndroidBottomPadding(
        isStakingConfirmationBool,
        isFullScreenConfirmation,
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
