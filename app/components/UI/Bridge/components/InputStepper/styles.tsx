import { Theme } from '@metamask/design-tokens';
import { Platform, StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';

export const inputStepperStyles = ({
  vars,
}: {
  vars: { fontSize: number };
  theme: Theme;
}) =>
  StyleSheet.create({
    container: {
      gap: 16,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    inputRow: {
      flexDirection: 'row',
      width: 100,
      justifyContent: 'center',
    },
    input: {
      backgroundColor: importedColors.transparent,
      borderWidth: 0,
      lineHeight: vars.fontSize * 1.25,
      height: vars.fontSize * 1.25,
      fontSize: vars.fontSize,
      ...(Platform.OS === 'android' && {
        includeFontPadding: false,
        textAlignVertical: 'center',
        paddingVertical: 0,
        paddingTop: 1,
      }),
    },
  });

export const inputStepperDescriptionRow = StyleSheet.create({
  descriptionRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    // Matches the design requirement: 8px gap between the warning icon and text.
    marginRight: 8,
  },
  descriptionTextWrapper: {
    flexShrink: 1,
  },
  descriptionText: {
    textAlign: 'center',
  },
});
