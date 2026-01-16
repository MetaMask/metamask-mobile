import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { ConditionalScrollViewProps } from './ConditionalScrollView.types';

/**
 * ConditionalScrollView renders either a ScrollView or content directly based on isScrollEnabled prop.
 * This is useful for homepage redesign where we want to remove nested scroll views in favor of a global scroll container.
 */
const ConditionalScrollView: React.FC<ConditionalScrollViewProps> = ({
  children,
  isScrollEnabled,
  scrollViewProps,
}) =>
  isScrollEnabled ? (
    <ScrollView {...scrollViewProps}>{children}</ScrollView>
  ) : (
    <>{children}</>
  );

export default ConditionalScrollView;
