import React, { forwardRef } from 'react';
import { ScrollView } from 'react-native';
import { ConditionalScrollViewProps } from './ConditionalScrollView.types';

/**
 * ConditionalScrollView renders either a ScrollView or content directly based on isScrollEnabled prop.
 * This is useful for homepage redesign where we want to remove nested scroll views in favor of a global scroll container.
 */
const ConditionalScrollView = forwardRef<
  ScrollView,
  ConditionalScrollViewProps
>(({ children, isScrollEnabled, scrollViewProps }, ref) =>
  isScrollEnabled ? (
    <ScrollView ref={ref} {...scrollViewProps}>
      {children}
    </ScrollView>
  ) : (
    <>{children}</>
  ),
);

ConditionalScrollView.displayName = 'ConditionalScrollView';

export default ConditionalScrollView;
