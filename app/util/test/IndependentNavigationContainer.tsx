import React from 'react';
import {
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';

interface IndependentNavigationContainerProps {
  children: React.ReactNode;
}

/**
 * Navigation container for tests that render their own navigator while already
 * sitting inside the container `renderWithProvider` provides by default.
 *
 * React Navigation v7 replaced v6's `<NavigationContainer independent>` prop
 * with the `NavigationIndependentTree` wrapper, so nesting a container now
 * requires two elements instead of one.
 */
export function IndependentNavigationContainer({
  children,
}: IndependentNavigationContainerProps) {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>{children}</NavigationContainer>
    </NavigationIndependentTree>
  );
}
