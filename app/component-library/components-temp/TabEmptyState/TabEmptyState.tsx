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

/**
 * @deprecated Please update your code to use `TabEmptyState` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/TabEmptyState/README.md}
 * @since @metamask/design-system-react-native@0.11.0
 */
export const TabEmptyState: React.FC<TabEmptyStateProps> = ({
  icon,
  description,
  descriptionProps,
  actionButtonText,
  actionButtonProps,
  onAction,
  children,
  style,
  twClassName = '',
  ...props
}) => (
  <Box
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    backgroundColor={BoxBackgroundColor.BackgroundDefault}
    gap={3}
    className={`max-w-64 ${twClassName}`}
    style={style}
    {...props}
  >
    {icon}
    {description && (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        className="text-center"
        {...descriptionProps}
      >
        {description}
      </Text>
    )}
    {actionButtonText && onAction && (
      <Button
        variant={ButtonVariant.Secondary}
        onPress={onAction}
        className="self-center"
        {...actionButtonProps}
      >
        {actionButtonText}
      </Button>
    )}
    {children}
  </Box>
);
