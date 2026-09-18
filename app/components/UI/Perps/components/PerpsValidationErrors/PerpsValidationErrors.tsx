import React from 'react';
import {
  Box,
  HelpText,
  HelpTextSeverity,
} from '@metamask/design-system-react-native';

/**
 * Reserves a line of vertical space so content below does not jump when an
 * error appears mid-entry. Matches the close-position and adjust-margin views.
 */
const DEFAULT_CONTAINER_CLASSNAME =
  'items-center justify-start px-4 my-4 min-h-10';

export interface PerpsValidationErrorsProps {
  /** Blocking validation messages, already filtered for display. */
  errors: readonly string[];
  /** Overrides the reserved-space container, e.g. the tighter bottom sheet row. */
  twClassName?: string;
  testID?: string;
}

/**
 * Centered list of blocking validation messages shared by the Perps flows that
 * render errors beneath an amount input.
 */
const PerpsValidationErrors: React.FC<PerpsValidationErrorsProps> = ({
  errors,
  twClassName = DEFAULT_CONTAINER_CLASSNAME,
  testID,
}) => (
  <Box twClassName={twClassName} testID={testID}>
    {errors.map((error) => (
      <HelpText
        key={error}
        severity={HelpTextSeverity.Danger}
        twClassName="w-full justify-center text-center"
      >
        {error}
      </HelpText>
    ))}
  </Box>
);

export default PerpsValidationErrors;
