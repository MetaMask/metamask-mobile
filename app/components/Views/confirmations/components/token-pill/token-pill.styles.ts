import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  const baseStyle: ViewStyle = {
    backgroundColor: colors.background.alternative,
    borderRadius: 99,
    paddingVertical: 4,
    paddingInline: 8,
    gap: 5,
  };

  const tokenIconStyle: ViewStyle = {
    width: 16,
    height: 16,
    borderRadius: 8,
  };

  const networkIconStyle: ViewStyle = {
    paddingTop: 4,
  };

  return StyleSheet.create({
    base: baseStyle,
    tokenIcon: tokenIconStyle,
    networkIcon: networkIconStyle,
  });
};

export default styleSheet;
