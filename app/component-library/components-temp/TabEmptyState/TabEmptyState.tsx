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
  twClassName,
  ...props
}) => (
  <Box
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    backgroundColor={BoxBackgroundColor.BackgroundDefault}
    gap={3}
    twClassName={`max-w-64 ${twClassName}`}
    style={style}
    {...props}
  >
    {icon}
    {description && (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        {...descriptionProps}
      >
        {description}
      </Text>
    )}
    {actionButtonText && onAction && (
      <Button
        variant={ButtonVariant.Secondary}
        onPress={onAction}
        {...actionButtonProps}
      >
        {actionButtonText}
      </Button>
    )}
    {children}
  </Box>
);
