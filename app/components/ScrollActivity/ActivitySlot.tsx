import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { View, type HostInstance } from 'react-native';
import {
  ContentHostContext,
  RegistryContext,
  SlotContext,
  type ActivitySlotContextValue,
} from './context';
import type { SlotSnapshot } from './ActivityRegistry';
import type { ActivityPhase, ActivitySlotChildren } from './types';

const ACTIVE_SNAPSHOT: SlotSnapshot = {
  phase: 'active',
  placeholderHeight: 0,
};

export interface ActivitySlotProps {
  id: string;
  estimatedHeight?: number;
  children: ActivitySlotChildren;
  /**
   * Injected when this slot's child index is listed in stickyHeaderIndices.
   * Sticky headers should stay outside slots.
   */
  stickyHeader?: boolean;
}

function renderSlotChildren(
  children: ActivitySlotChildren,
  phase: ActivityPhase,
): ReactNode {
  if (typeof children === 'function') {
    return children({ phase });
  }
  return children;
}

function ActivitySlotBody({
  id,
  joined,
  children,
}: {
  id: string;
  joined: boolean;
  children: ActivitySlotChildren;
}) {
  const registry = useContext(RegistryContext);
  const contentHostRef = useContext(ContentHostContext);
  const slotRef = useRef<View>(null);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!registry || !joined) {
        return () => undefined;
      }
      return registry.subscribe(id, listener);
    },
    [registry, joined, id],
  );

  const getSnapshot = useCallback(() => {
    if (!registry || !joined) {
      return ACTIVE_SNAPSHOT;
    }
    return registry.getSnapshot(id);
  }, [registry, joined, id]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const measure = useCallback(() => {
    const node = slotRef.current;
    const relative = contentHostRef?.current;
    if (!registry || !joined || !node || !relative) {
      return;
    }
    try {
      node.measureLayout(
        relative as HostInstance,
        (_x, y, _width, height) => {
          registry.updateLayout(id, y, height);
        },
        () => undefined,
      );
    } catch {
      // A failed measurement keeps the last height.
    }
  }, [contentHostRef, registry, joined, id]);

  const dormant = snapshot.phase === 'dormant';
  const placeholderStyle = { height: snapshot.placeholderHeight };

  return (
    <View
      key={dormant ? 'dormant' : 'mounted'}
      ref={slotRef}
      collapsable={false}
      onLayout={measure}
      style={dormant ? placeholderStyle : undefined}
      testID={
        dormant ? `activity-slot-placeholder-${id}` : `activity-slot-${id}`
      }
    >
      {dormant ? null : renderSlotChildren(children, snapshot.phase)}
    </View>
  );
}

export function ActivitySlot({
  id,
  estimatedHeight,
  children,
  stickyHeader = false,
}: ActivitySlotProps) {
  const registry = useContext(RegistryContext);
  const [registration] = useState(() => {
    if (!registry) {
      return { joined: false, duplicate: false };
    }
    return registry.register({
      id,
      estimatedHeight,
      sticky: stickyHeader,
    });
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !stickyHeader) {
      return undefined;
    }
    console.warn(
      `ActivitySlot id "${id}" is listed in stickyHeaderIndices and stays mounted.`,
    );
    return undefined;
  }, [id, stickyHeader]);

  useEffect(() => {
    if (!registry || !registration.joined) {
      return undefined;
    }
    return () => {
      registry.unregister(id);
    };
  }, [registry, registration.joined, id]);

  const slotContext = useMemo<ActivitySlotContextValue>(
    () => ({ id, joined: registration.joined }),
    [id, registration.joined],
  );

  if (!registry) {
    throw new Error('ActivitySlot must be used within ActivityScrollView');
  }

  return (
    <SlotContext.Provider value={slotContext}>
      <ActivitySlotBody id={id} joined={registration.joined}>
        {children}
      </ActivitySlotBody>
    </SlotContext.Provider>
  );
}
