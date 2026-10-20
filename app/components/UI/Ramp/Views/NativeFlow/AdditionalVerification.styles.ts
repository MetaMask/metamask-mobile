import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export interface AdditionalVerificationStyleSheetVars {
  /** Shorter window side: the width on portrait phones, the height in iPad landscape. */
  shortSide: number;
}

const styleSheet = ({
  vars,
}: {
  theme: Theme;
  vars: AdditionalVerificationStyleSheetVars;
}) =>
  StyleSheet.create({
    image: {
      width: vars.shortSide,
      height: vars.shortSide * 0.75,
      alignSelf: 'center',
    },
    title: {
      marginTop: 24,
      fontWeight: 'bold',
    },
    paragraph: {
      marginTop: 16,
    },
    footerContent: {
      gap: 8,
    },
  });

export default styleSheet;
