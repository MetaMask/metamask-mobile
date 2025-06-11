import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

const styleSheet = (params: {
  theme: Theme;
  vars: { bothOptionsEnabled: boolean };
}) => {
  const {
    theme: { colors },
    vars: { bothOptionsEnabled },
  } = params;

  const baseExportCredentialsStyle = {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: 8,
    backgroundColor: colors.background.alternative,
  };

  return StyleSheet.create({
    container: {
      marginBottom: 16,
    },

    exportPrivateKey: {
      ...baseExportCredentialsStyle,
      borderTopLeftRadius: bothOptionsEnabled ? 0 : 8,
      borderTopRightRadius: bothOptionsEnabled ? 0 : 8,
    },
    exportMnemonic: {
      ...baseExportCredentialsStyle,
      borderBottomLeftRadius: bothOptionsEnabled ? 0 : 8,
      borderBottomRightRadius: bothOptionsEnabled ? 0 : 8,
      marginBottom: 1,
    },
  });
};

export default styleSheet;
