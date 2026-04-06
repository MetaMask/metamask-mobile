import type { NavigationPort } from '../ports';

export interface TestNavigationAdapter extends NavigationPort {
  popCallCount: number;
  triggerTransitionEnd: () => void;
  triggerBeforeRemove: () => void;
}

export function createTestNavigationAdapter(): TestNavigationAdapter {
  let transitionEndCb: (() => void) | null = null;
  let beforeRemoveCb: (() => void) | null = null;

  return {
    popCallCount: 0,

    pop() {
      this.popCallCount++;
    },

    onTransitionEnd(cb) {
      transitionEndCb = cb;
      return () => {
        transitionEndCb = null;
      };
    },

    onBeforeRemove(cb) {
      beforeRemoveCb = cb;
      return () => {
        beforeRemoveCb = null;
      };
    },

    triggerTransitionEnd() {
      transitionEndCb?.();
    },

    triggerBeforeRemove() {
      beforeRemoveCb?.();
    },
  };
}
