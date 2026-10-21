import React from 'react';
import { View } from 'react-native';

import { DEFERRED_RENDER_PLACEHOLDER_TEST_ID } from './constants';
import type { DeferredPlaceholderProps } from './types';

/**
 * Fixed-height spacer shown until deferred children mount.
 *
 * Uses a raw `View` rather than design-system `Box`. `Box` always applies
 * `flex`, which grows the spacer instead of reserving `height`.
 *
 * The spacer is hidden from assistive tech and is not a focus target.
 * Do not put tappable actions here. Do not defer those actions at all.
 */
export function DeferredPlaceholder({
  height,
  testID = DEFERRED_RENDER_PLACEHOLDER_TEST_ID,
}: DeferredPlaceholderProps) {
  return (
    <View
      testID={testID}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      focusable={false}
      pointerEvents="none"
      collapsable={false}
      style={{ height }}
    />
  );
}
