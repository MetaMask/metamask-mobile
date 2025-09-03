// Third party dependencies
import React from 'react';

// External dependencies
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

// Internal dependencies
import { QuickActionButtonProps } from './QuickActionButton.types';

/**
 * Individual QuickActionButton component
 */
const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  children,
  ...props
}) => (
  <Button
    size={ButtonSize.Lg}
    isFullWidth
    variant={ButtonVariant.Secondary}
    {...props}
    twClassName={`px-2 min-w-0 ${props.twClassName || ''}`}
  >
    {children}
  </Button>
);

export default QuickActionButton;
