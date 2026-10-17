import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export interface VerifyIdentityStyleSheetVars {
  /** Shorter window side: the width on portrait phones, the height in iPad landscape. */
  shortSide: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: VerifyIdentityStyleSheetVars;
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    title: {
      marginTop: 16,
      fontWeight: 'bold',
    },
    image: {
      width: vars.shortSide * 0.65,
      height: vars.shortSide * 0.49,
      alignSelf: 'center',
      marginVertical: 16,
    },
    description: {
      marginTop: 24,
    },
    descriptionCompact: {
      marginTop: 12,
    },
    privacyPolicyLink: {
      marginTop: 8,
      color: theme.colors.primary.default,
    },
    footerContent: {
      gap: 8,
    },
    agreementText: {
      marginTop: 24,
    },
    linkText: {
      textDecorationLine: 'underline',
    },
    scrollContainer: {
      flexGrow: 1,
    },
  });
};

export default styleSheet;
