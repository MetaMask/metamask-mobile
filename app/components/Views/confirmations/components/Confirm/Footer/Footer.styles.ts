import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import Device from '../../../../../../util/device';

const styleSheet = (params: {
  theme: Theme;
  vars: { isStakingConfirmationBool: boolean };
}) => {
  const {
    theme: { colors },
    vars: { isStakingConfirmationBool },
  } = params;

  const basePaddingBottom = Device.isIos()
    ? (isStakingConfirmationBool ? 16 : 8)
    : (isStakingConfirmationBool ? 36 : 28);

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
