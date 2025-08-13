import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (_params: { theme: Theme }) => {
  const baseStyle: ViewStyle = {
    borderRadius: 99,
  };

  const tokenIconStyle: ViewStyle = {
    width: 34,
    height: 34,
    borderRadius: 99,
  };

  const networkIconStyle: ViewStyle = {
    marginTop: 4,
  };

  return StyleSheet.create({
    base: baseStyle,
    tokenIcon: tokenIconStyle,
    networkIcon: networkIconStyle,
  });
};

export default styleSheet;
