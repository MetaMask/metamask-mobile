import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isLogoSizeMd?: boolean;
  };
}) => {
  const { isLogoSizeMd } = params.vars ?? { isLogoSizeMd: false };
  return StyleSheet.create({
    badgeWrapper: {
      marginRight: 4,
    },
    logoNative: {
      width: isLogoSizeMd ? 32 : 16,
      height: isLogoSizeMd ? 32 : 16,
      borderRadius: 99,
    },
  });
};

export default styleSheet;
