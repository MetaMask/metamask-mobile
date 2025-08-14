import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (_params: { theme: Theme }) => {
  const container: ViewStyle = {
    marginTop: 4,
  };

  const tokenIcon: ViewStyle = {
    width: 34,
    height: 34,
    borderRadius: 99,
  };

  return StyleSheet.create({
    container,
    tokenIcon,
  });
};

export default styleSheet;
