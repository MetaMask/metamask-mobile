import React, {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { View } from 'react-native';
import { getHardwareTier } from '../../util/deviceCapability';
import {
  createActivityRegistry,
  type ActivityRegistry,
} from './ActivityRegistry';
import { ContentHostContext, RegistryContext } from './context';

/**
 * Registry for a screen whose scroll container is not `ActivityScrollView`.
 * Animated scroll handlers report content offset through `reportScroll`.
 */
export function useActivityScrollHost() {
  const [registry] = useState(() => createActivityRegistry(getHardwareTier()));
  const contentRef = useRef<View>(null);
  const reportScroll = useCallback(
    (scrollY: number, viewportHeight: number) => {
      registry.setViewportHeight(viewportHeight);
      registry.setScrollY(scrollY);
    },
    [registry],
  );

  return { registry, contentRef, reportScroll };
}

export function ActivityScrollProvider({
  registry,
  contentRef,
  children,
}: {
  registry: ActivityRegistry;
  contentRef: RefObject<View | null>;
  children: ReactNode;
}) {
  return (
    <RegistryContext.Provider value={registry}>
      <ContentHostContext.Provider value={contentRef}>
        {children}
      </ContentHostContext.Provider>
    </RegistryContext.Provider>
  );
}
