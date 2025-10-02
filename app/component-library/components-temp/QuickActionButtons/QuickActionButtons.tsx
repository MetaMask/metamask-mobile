// Third party dependencies
import React, { Children, ReactElement, cloneElement } from 'react';

// External dependencies
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';

// Internal dependencies
import QuickActionButton from './QuickActionButton';
import { QuickActionButtonsProps } from './QuickActionButtons.types';

export { QuickActionButton };

/**
 * Container component for QuickActionButton components
 */
const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({
  children,
  buttonsPerRow = 4,
  rowWrapperProps,
  buttonWrapperProps,
  spacerProps,
  ...props
}) => {
  // Convert children to array and process them
  const buttonElements = Children.toArray(children).filter(
    (child): child is ReactElement => React.isValidElement(child),
  );

  // Process children and add default props if needed
  const processedButtons = buttonElements.map((button, index) => {
    // Add default props to QuickActionButton components
    if (button.type === QuickActionButton) {
      return cloneElement(button, {
        key: button.key || `quick-action-button-${index}`,
      });
    }
    return button;
  });

  // Group buttons into rows
  const buttonRows: ReactElement[][] = [];
  for (let i = 0; i < processedButtons.length; i += buttonsPerRow) {
    buttonRows.push(processedButtons.slice(i, i + buttonsPerRow));
  }

  return (
    <Box gap={3} {...props}>
      {buttonRows.map((row, rowIndex) => (
        <Box
          key={`row-${rowIndex}`}
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          gap={3}
          {...rowWrapperProps}
        >
          {row.map((button, buttonIndex) => (
            <Box
              key={button.key || `button-${buttonIndex}`}
              // Box wrapper with flex-1 is needed to ensure the QuickActionButton doesn't collapse
              twClassName="flex-1"
              {...buttonWrapperProps}
            >
              {button}
            </Box>
          ))}
          {/* Add empty spacers if the last row is not full */}
          {row.length < buttonsPerRow &&
            Array.from({ length: buttonsPerRow - row.length }).map((_, i) => (
              <Box
                key={`spacer-${rowIndex}-${i}`}
                twClassName="flex-1"
                {...spacerProps}
              />
            ))}
        </Box>
      ))}
    </Box>
  );
};

export default QuickActionButtons;
