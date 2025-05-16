import { Theme } from '@metamask/design-tokens';
import { FlexAlignType, StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    tagBaseStyle: {
      alignSelf: 'center' as FlexAlignType,
      backgroundColor: theme.colors.background.alternative,
      borderColor: theme.colors.border.default,
      borderWidth: 1,
      marginTop: 16,
    },
  });
};

export default styleSheet;
