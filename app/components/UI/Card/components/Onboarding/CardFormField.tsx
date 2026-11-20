import React from 'react';
import {
  Box,
  FontWeight,
  HelpText,
  HelpTextSeverity,
  Label,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface CardFormFieldProps {
  /** Visible field label. Omit for fields whose label is the step title. */
  label?: string;
  /** The control: TextField, SelectField, a row of controls, etc. */
  children: React.ReactNode;
  /** Neutral helper text shown under the control. */
  helpText?: React.ReactNode;
  helpTextTestID?: string;
  /** Error text shown under the control (and under any helper text). */
  errorText?: React.ReactNode;
  errorTestID?: string;
  testID?: string;
}

/**
 * Label, control and helper/error text for one Card form field.
 *
 * Matches the shipped ImportFromSecretRecoveryPhrase password step:
 * BodyMd Medium label 4pt above the control, HelpText 8pt below it.
 */
const CardFormField = ({
  label,
  children,
  helpText,
  helpTextTestID,
  errorText,
  errorTestID,
  testID,
}: CardFormFieldProps) => (
  <Box gap={2} testID={testID}>
    {label ? (
      <Label
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        twClassName="-mb-1"
      >
        {label}
      </Label>
    ) : null}
    {children}
    {helpText ? (
      <HelpText color={TextColor.TextAlternative} testID={helpTextTestID}>
        {helpText}
      </HelpText>
    ) : null}
    {errorText ? (
      <HelpText
        severity={HelpTextSeverity.Danger}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID={errorTestID}
      >
        {errorText}
      </HelpText>
    ) : null}
  </Box>
);

export default CardFormField;
