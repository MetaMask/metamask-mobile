import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';
import { TokenIconVariant } from './token-icon';

function getIconSize(variant: TokenIconVariant) {
  switch (variant) {
    case TokenIconVariant.Hero:
      return 44;
    case TokenIconVariant.Row:
      return 16;
    default:
      return 34;
  }
}

const styleSheet = (params: {
  theme: Theme;
  vars: { variant: TokenIconVariant };
}) => {
  const { variant } = params.vars;

  const container: ViewStyle = {
    marginTop: 4,
  };

  const tokenIcon: ViewStyle = {
    width: getIconSize(variant),
    height: getIconSize(variant),
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
