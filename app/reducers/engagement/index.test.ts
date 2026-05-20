import { configureStore } from '@reduxjs/toolkit';
import engagementReducer, {
  surfaceCompleted,
  surfaceStatusReported,
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
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      expect(
        getState(store).engagement.startupSurfaces.statuses['push-pre-prompt'],
      ).toBe('eligible');
    });

    it('overwrites a previous status', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      expect(
        getState(store).engagement.startupSurfaces.statuses['push-pre-prompt'],
      ).toBe('ineligible');
    });
  });

  describe('surfaceCompleted', () => {
    it('adds a surface to completed', () => {
      const store = makeStore();
      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      expect(getState(store).engagement.startupSurfaces.completed).toContain(
        'push-pre-prompt',
      );
    });

    it('does not duplicate a completed surface', () => {
      const store = makeStore();
      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      expect(
        getState(store).engagement.startupSurfaces.completed.filter(
          (id) => id === 'push-pre-prompt',
        ),
      ).toHaveLength(1);
    });
  });

  describe('selectActiveStartupSurfaceId', () => {
    it('returns null when the surface is resolving', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBeNull();
    });

    it('activates push when it is eligible', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );
    });

    it('does not reactivate a completed surface in the same session', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBeNull();
    });

    it('keeps the active surface when its status transiently becomes resolving mid-flow', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );

      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
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
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );
    });

    it('only clears the active surface after surfaceCompleted', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'ineligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );

      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      expect(selectActiveStartupSurfaceId(getState(store))).toBeNull();
    });

    it('queues Perps and Predict ids behind push when their statuses are reported', () => {
      const store = makeStore();
      store.dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'eligible' }),
      );
      store.dispatch(
        surfaceStatusReported({ id: 'predict-gtm', status: 'eligible' }),
      );
      expect(selectActiveStartupSurfaceId(getState(store))).toBe(
        'push-pre-prompt',
      );

      store.dispatch(surfaceCompleted({ id: 'push-pre-prompt' }));
      expect(selectActiveStartupSurfaceId(getState(store))).toBe('perps-gtm');

      store.dispatch(surfaceCompleted({ id: 'perps-gtm' }));
      expect(selectActiveStartupSurfaceId(getState(store))).toBe('predict-gtm');
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
