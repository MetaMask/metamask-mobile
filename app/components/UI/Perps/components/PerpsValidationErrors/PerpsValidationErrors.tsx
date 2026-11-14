import React from 'react';
import {
  Box,
  HelpText,
  HelpTextSeverity,
} from '@metamask/design-system-react-native';

const DEFAULT_CONTAINER_CLASSNAME =
  'items-center justify-start px-4 my-4 min-h-10';

export interface PerpsValidationErrorsProps {
  /** Blocking validation messages, already filtered for display. */
  errors: readonly string[];
  /** Layout classes for the error list. */
  twClassName?: string;
  /**
   * `start` matches the trade sheet, which left-aligns its errors directly
   * above the CTA. The full-screen close and adjust-margin flows center theirs.
   */
  alignment?: 'center' | 'start';
  testID?: string;
}

/**
 * Centered list of blocking validation messages shared by the Perps flows that
 * render errors beneath an amount input.
 */
const PerpsValidationErrors: React.FC<PerpsValidationErrorsProps> = ({
  errors,
  twClassName = DEFAULT_CONTAINER_CLASSNAME,
  alignment = 'center',
  testID,
}) => {
  const messages = errors.filter((error) => error.trim().length > 0);

  if (messages.length === 0) {
    return null;
  }

  return (
    <Box
      twClassName={twClassName}
      testID={testID}
      accessibilityLiveRegion="polite"
    >
      {messages.map((error) => (
        <HelpText
          key={error}
          severity={HelpTextSeverity.Danger}
          accessibilityRole="alert"
          twClassName={
            alignment === 'center'
              ? 'w-full justify-center text-center'
              : 'w-full'
          }
        >
          {error}
        </HelpText>
      ))}
    </Box>
  );
};

export default PerpsValidationErrors;
