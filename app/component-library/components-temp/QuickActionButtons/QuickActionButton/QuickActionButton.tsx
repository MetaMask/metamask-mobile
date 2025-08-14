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
    {...props}
    variant={ButtonVariant.Secondary} // TODO: have to put after spreading props because it's a required prop and putting it before we get a type error will be fixed in next release of MMDS
    twClassName={`px-2 min-w-0 ${props.twClassName || ''}`}
  >
    {children}
  </Button>
);

export default QuickActionButton;
