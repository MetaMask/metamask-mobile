import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';
import { TokenIconVariant } from './token-icon';

function getIconSize(variant: TokenIconVariant, size?: number) {
  if (size !== undefined) {
    return size;
  }
  switch (variant) {
    case TokenIconVariant.Hero:
      return 44;
    case TokenIconVariant.Row:
      return 20;
    default:
      return 32;
  }
}

const styleSheet = (params: {
  theme: Theme;
  vars: { variant: TokenIconVariant; size?: number };
}) => {
  const { variant, size } = params.vars;

  const container: ViewStyle = {
    alignSelf: 'center',
  };

  const tokenIcon: ViewStyle = {
    width: getIconSize(variant, size),
    height: getIconSize(variant, size),
    borderRadius: 99,
  };

  const badge: ViewStyle = {};

  return StyleSheet.create({
    badge,
    container,
    tokenIcon,
  });
};

export default styleSheet;
