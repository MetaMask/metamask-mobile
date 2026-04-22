import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

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
      borderWidth: 0,
      lineHeight: vars.fontSize * 1.25,
      height: vars.fontSize * 1.25,
      fontSize: vars.fontSize,
    },
  });

export const inputStepperDescriptionRow = StyleSheet.create({
  descriptionRow: {
    flexDirection: 'row',
    width: '75%',
    marginHorizontal: 'auto',
  },
  descriptionTextWrapper: {
    flex: 1,
  },
  descriptionText: {
    textAlign: 'center',
  },
});
