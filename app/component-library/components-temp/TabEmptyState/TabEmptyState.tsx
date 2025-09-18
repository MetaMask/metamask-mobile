import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  BoxBackgroundColor,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

import type { TabEmptyStateProps } from './TabEmptyState.types';

export const TabEmptyState: React.FC<TabEmptyStateProps> = ({
  icon,
  description,
  descriptionProps,
  actionButtonText,
  actionButtonProps,
  onAction,
  children,
  style,
  ...props
}) => (
  <Box
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    backgroundColor={BoxBackgroundColor.BackgroundDefault}
    twClassName="max-w-56 p-4"
    style={style}
    {...props}
  >
    {icon && <Box twClassName="mb-4">{icon}</Box>}

    {description && (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center mb-2"
        {...descriptionProps}
      >
        {description}
      </Text>
    )}

    {actionButtonText && onAction && (
      <Button
        variant={ButtonVariant.Tertiary}
        onPress={onAction}
        {...actionButtonProps}
      >
        {actionButtonText}
      </Button>
    )}

    {children}
  </Box>
);
