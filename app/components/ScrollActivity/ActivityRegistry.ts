import type { HardwareTier } from '../../util/deviceCapability/types';
import {
  activityMarginForHardwareTier,
  resolveActivityPhase,
} from './resolveActivityPhase';
import type { ActivityPhase } from './types';

export interface SlotSnapshot {
  phase: ActivityPhase;
  placeholderHeight: number;
}

const EMPTY_SNAPSHOT: SlotSnapshot = {
  phase: 'active',
  placeholderHeight: 0,
};

interface SlotEntry {
  id: string;
  estimatedHeight?: number;
  sticky: boolean;
  measuredTop?: number;
  measuredHeight?: number;
  phase: ActivityPhase;
  hasResolved: boolean;
  snapshot: SlotSnapshot;
  listeners: Set<() => void>;
}

export interface SlotRegistration {
  joined: boolean;
  duplicate: boolean;
}

export interface ActivityRegistry {
  register(input: {
    id: string;
    estimatedHeight?: number;
    sticky: boolean;
  }): SlotRegistration;
  unregister(id: string): void;
  subscribe(id: string, listener: () => void): () => void;
  getPhase(id: string): ActivityPhase;
  getSnapshot(id: string): SlotSnapshot;
  setScrollY(scrollY: number): void;
  setViewportHeight(viewportHeight: number): void;
  updateLayout(id: string, top: number, height: number): void;
  hasSlotState(id: string, key: string): boolean;
  getSlotState(id: string, key: string): unknown;
  setSlotState(id: string, key: string, value: unknown): void;
}

interface SlotGeometry {
  top: number;
  height: number;
}

export function createActivityRegistry(
  tier: HardwareTier | null,
): ActivityRegistry {
  let scrollY = 0;
  let viewportHeight = 0;
  const slots = new Map<string, SlotEntry>();
  let order: string[] = [];
  const stateBySlot = new Map<string, Record<string, unknown>>();

  function geometryFor(entry: SlotEntry): SlotGeometry | null {
    if (entry.measuredTop !== undefined && entry.measuredHeight !== undefined) {
      return { top: entry.measuredTop, height: entry.measuredHeight };
    }

    const index = order.indexOf(entry.id);
    let top = 0;
    for (let aboveIndex = 0; aboveIndex < index; aboveIndex += 1) {
      const above = slots.get(order[aboveIndex]);
      if (!above) {
        return null;
      }
      if (above.measuredHeight !== undefined) {
        top += above.measuredHeight;
      } else if (above.estimatedHeight !== undefined) {
        top += above.estimatedHeight;
      } else {
        return null;
      }
    }

    if (entry.estimatedHeight === undefined) {
      return null;
    }
    return { top, height: entry.estimatedHeight };
  }

  function computePhase(entry: SlotEntry): ActivityPhase {
    const geometry = geometryFor(entry);
    if (!geometry) {
      return 'active';
    }

    let next: ActivityPhase;
    if (viewportHeight <= 0) {
      next = geometry.top > 0 ? 'dormant' : 'active';
      entry.hasResolved = true;
    } else {
      next = resolveActivityPhase({
        scrollY,
        viewportHeight,
        slotTop: geometry.top,
        slotHeight: geometry.height,
        margin: activityMarginForHardwareTier(tier, viewportHeight),
        currentPhase: entry.hasResolved ? entry.phase : null,
      });
      entry.hasResolved = true;
    }

    if (entry.sticky && next === 'dormant') {
      return 'paused';
    }
    return next;
  }

  function publish(entry: SlotEntry) {
    const nextPhase = computePhase(entry);
    const placeholderHeight =
      entry.measuredHeight ?? entry.estimatedHeight ?? 0;
    entry.phase = nextPhase;
    if (
      entry.snapshot.phase === nextPhase &&
      entry.snapshot.placeholderHeight === placeholderHeight
    ) {
      return;
    }
    entry.snapshot = { phase: nextPhase, placeholderHeight };
    entry.listeners.forEach((listener) => {
      listener();
    });
  }

  function recomputeAll() {
    order.forEach((id) => {
      const entry = slots.get(id);
      if (entry) {
        publish(entry);
      }
    });
  }

  return {
    register({ id, estimatedHeight, sticky }) {
      if (slots.has(id)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `ActivitySlot id "${id}" is duplicated. The first registration wins.`,
          );
        }
        return { joined: false, duplicate: true };
      }

      const entry: SlotEntry = {
        id,
        estimatedHeight,
        sticky,
        phase: 'active',
        hasResolved: false,
        snapshot: {
          phase: 'active',
          placeholderHeight: estimatedHeight ?? 0,
        },
        listeners: new Set(),
      };
      slots.set(id, entry);
      order.push(id);
      publish(entry);
      return { joined: true, duplicate: false };
    },

    unregister(id) {
      if (!slots.has(id)) {
        return;
      }
      slots.delete(id);
      order = order.filter((slotId) => slotId !== id);
      recomputeAll();
    },

    subscribe(id, listener) {
      const entry = slots.get(id);
      if (!entry) {
        return () => undefined;
      }
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
      };
    },

    getPhase(id) {
      return slots.get(id)?.snapshot.phase ?? 'active';
    },

    getSnapshot(id) {
      return slots.get(id)?.snapshot ?? EMPTY_SNAPSHOT;
    },

    setScrollY(nextScrollY) {
      if (scrollY === nextScrollY) {
        return;
      }
      scrollY = nextScrollY;
      recomputeAll();
    },

    setViewportHeight(nextViewportHeight) {
      if (viewportHeight === nextViewportHeight) {
        return;
      }
      viewportHeight = nextViewportHeight;
      recomputeAll();
    },

    updateLayout(id, top, height) {
      const entry = slots.get(id);
      if (!entry) {
        return;
      }
      if (entry.measuredTop === top && entry.measuredHeight === height) {
        return;
      }
      entry.measuredTop = top;
      entry.measuredHeight = height;
      recomputeAll();
    },

    hasSlotState(id, key) {
      const bucket = stateBySlot.get(id);
      if (!bucket) {
        return false;
      }
      return Object.prototype.hasOwnProperty.call(bucket, key);
    },

    getSlotState(id, key) {
      return stateBySlot.get(id)?.[key];
    },

    setSlotState(id, key, value) {
      const bucket = stateBySlot.get(id) ?? {};
      stateBySlot.set(id, { ...bucket, [key]: value });
    },
  };
}
