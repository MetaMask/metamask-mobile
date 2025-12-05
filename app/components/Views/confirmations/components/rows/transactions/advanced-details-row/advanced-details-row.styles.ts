import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isNonceChangeDisabled: boolean };
}) => {
  const {
    theme,
    vars: { isNonceChangeDisabled },
  } = params;

  return StyleSheet.create({
    nonceText: isNonceChangeDisabled
      ? {
          color: theme.colors.text.default,
        }
      : {
          textDecorationLine: 'underline',
          color: theme.colors.primary.default,
        },
    infoRowOverride: {
      paddingBottom: 4,
      paddingHorizontal: 8,
    },
    dataScrollContainer: {
      height: 200,
    },
    skeletonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    skeletonBorderRadius: {
      borderRadius: 4,
    },
  });
};

export default styleSheet;
