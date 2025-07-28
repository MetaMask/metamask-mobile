import React from 'react';
import { useIsFocused } from '@react-navigation/native';

/**
 * Props for the UnmountOnBlur component
 */
export interface UnmountOnBlurProps {
  /**
   * The children to render when the screen is focused
   */
  children: React.ReactNode;
  /**
   * Optional fallback component to render when screen is not focused
   * If not provided, null will be rendered (unmounting the children)
   */
  fallback?: React.ReactNode;
}

/**
 * UnmountOnBlur component that conditionally renders its children
 * based on whether the current screen is focused or not.
 *
 * This is useful for optimizing performance by unmounting heavy components
 * when they are not visible, or for preventing background operations
 * when the screen is not active.
 *
 * @param props - The component props
 * @returns JSX element or null
 */
export const UnmountOnBlur: React.FC<UnmountOnBlurProps> = ({
  children,
  fallback = null,
}) => {
  const isFocused = useIsFocused();

  if (!isFocused) {
    return fallback;
  }

  return children;
};

export default UnmountOnBlur;
