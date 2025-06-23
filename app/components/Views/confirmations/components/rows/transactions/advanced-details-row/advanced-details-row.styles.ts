import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isSTXUsable: boolean };
}) => {
  const {
    theme,
    vars: { isSTXUsable },
  } = params;

  return StyleSheet.create({
    nonceText: isSTXUsable
      ? {
          textDecorationLine: 'underline',
          color: theme.colors.primary.default,
        }
      : {
          color: theme.colors.text.default,
        },
    infoRowOverride: {
      paddingBottom: 4,
      paddingHorizontal: 8,
    },
    dataScrollContainer: {
      height: 200,
    },
  });
};

export default styleSheet;
