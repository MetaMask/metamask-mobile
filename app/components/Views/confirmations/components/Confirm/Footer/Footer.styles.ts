import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import Device from '../../../../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme: { colors }} = params;

  return StyleSheet.create({
    base: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingBottom: Device.isIos() ? 8 : 28,
      paddingTop: 16,
    },
    linkText: {
      textDecorationLine: 'underline',
    },
    textContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: 24,
      paddingBottom: 16,
    },
  });
};

export default styleSheet;
