import { configureStore } from '@reduxjs/toolkit';
import engagementReducer, {
  surfaceStatusReported,
  surfaceCompleted,
} from './index';
import {
  selectActiveStartupSurfaceId,
  selectCompletedStartupSurfaceIds,
} from './selectors';
import type { RootState } from '../index';

const makeStore = () =>
  configureStore({ reducer: { engagement: engagementReducer } });

type TestStore = ReturnType<typeof makeStore>;

const getState = (store: TestStore): RootState =>
  store.getState() as unknown as RootState;

describe('engagement slice — startup surfaces', () => {
  describe('surfaceStatusReported', () => {
    it('records a surface status', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      expect(
        getState(store).engagement.startupSurfaces.statuses['perps-gtm'],
      ).toBe('eligible');
    });

    it('overwrites a previous status', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'resolving' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'ineligible' }),
      );
      expect(
        getState(store).engagement.startupSurfaces.statuses['perps-gtm'],
      ).toBe('ineligible');
    });
  });

  describe('surfaceCompleted', () => {
    it('adds a surface to completed', () => {
      const store = makeStore();
      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
      expect(getState(store).engagement.startupSurfaces.completed).toContain(
        'perps-gtm',
      );
    });

    it('does not duplicate a completed surface', () => {
      const store = makeStore();
      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
      expect(
        getState(store).engagement.startupSurfaces.completed.filter(
          (id) => id === 'perps-gtm',
        ),
      ).toHaveLength(1);
    });
  });

  describe('selectActiveStartupSurfaceId', () => {
    it('returns null when all surfaces are resolving', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBeNull();
    });

    it('keeps lower-priority surfaces blocked while push is resolving', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBeNull();
    });

    it('activates push before Perps when both are eligible', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );
    });

    it('queues Perps after push completes', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      expect(selectActiveStartupSurfaceId(getState(store))).toBe('perps-gtm');
    });

    it('activates Perps before Predict when push is ineligible', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'predict-gtm', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe('perps-gtm');
    });

    it('does not reactivate a completed surface in the same session', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
      // Even if perps is still reported as eligible it should not re-activate
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBeNull();
    });

    it('does not clear the active surface when it moves back to resolving (absolute sticky)', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );
      // Once active, status updates cannot displace the surface.
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );
    });

    it('queues Predict behind Perps when both are eligible', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'predict-gtm', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe('perps-gtm');

      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
      expect(selectActiveStartupSurfaceId(getState(store))).toBe('predict-gtm');
    });

    describe('absolute sticky — status updates cannot displace an active surface', () => {
      it('keeps the active surface when its status transiently becomes resolving mid-flow', () => {
        const store = makeStore();
        store.dispatch(
          surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
        );
        expect(selectActiveStartupSurfaceId(getState(store))).toBe(
          'push-pre-prompt',
        );

        // App backgrounds during OS prompt → push briefly reports resolving.
        store.dispatch(
          surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
        );
        // Absolute sticky: push stays active.
        expect(selectActiveStartupSurfaceId(getState(store))).toBe(
          'push-pre-prompt',
        );
      });

      it('keeps the active surface even when it reports ineligible mid-flow', () => {
        const store = makeStore();
        store.dispatch(
          surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
        );
        store.dispatch(
          surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
        );
        expect(selectActiveStartupSurfaceId(getState(store))).toBe(
          'push-pre-prompt',
        );

        // markPrePromptShown() causes the hook to dispatch ineligible before
        // surfaceCompleted fires (the race condition we're guarding against).
        store.dispatch(
          surfaceStatusReported({
            id: 'push-pre-prompt',
            status: 'ineligible',
          }),
        );
        // Push stays active; perps-gtm does NOT jump in.
        expect(selectActiveStartupSurfaceId(getState(store))).toBe(
          'push-pre-prompt',
        );
      });

      it('only advances after surfaceCompleted, even if status went ineligible first', () => {
        const store = makeStore();
        store.dispatch(
          surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
        );
        store.dispatch(
          surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
        );

        // Status goes ineligible mid-flow — should NOT advance.
        store.dispatch(
          surfaceStatusReported({
            id: 'push-pre-prompt',
            status: 'ineligible',
          }),
        );
        expect(selectActiveStartupSurfaceId(getState(store))).toBe(
          'push-pre-prompt',
        );

        // surfaceCompleted fires — now advances.
        store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
        expect(selectActiveStartupSurfaceId(getState(store))).toBe('perps-gtm');
      });
    });
  });

  describe('selectCompletedStartupSurfaceIds', () => {
    it('starts empty', () => {
      const store = makeStore();
      expect(selectCompletedStartupSurfaceIds(getState(store))).toEqual([]);
    });

    it('includes completed surfaces', () => {
      const store = makeStore();
      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
      expect(selectCompletedStartupSurfaceIds(getState(store))).toEqual([
        'push-pre-prompt',
        'perps-gtm',
      ]);
    });
  });
});
