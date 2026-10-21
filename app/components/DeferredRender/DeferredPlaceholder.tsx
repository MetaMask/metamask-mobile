import React, { useRef } from 'react';
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
  const warnedInvalidHeightRef = useRef(false);

  if (
    __DEV__ &&
    !warnedInvalidHeightRef.current &&
    (!Number.isFinite(height) || height <= 0)
  ) {
    warnedInvalidHeightRef.current = true;
    console.warn(
      `DeferredPlaceholder expected a positive height and received ${height}.`,
    );
  }

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
