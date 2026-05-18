import {
  getDefaultStartupSurfaceState,
  startupSurfaceReducer,
  type StartupSurfaceCandidate,
  type StartupSurfaceStatus,
} from './state';

const createSurfaces = ({
  perps = 'resolving',
  predict = 'resolving',
  push = 'resolving',
}: {
  perps?: StartupSurfaceStatus;
  predict?: StartupSurfaceStatus;
  push?: StartupSurfaceStatus;
}): StartupSurfaceCandidate[] => [
  { id: 'push-pre-prompt', status: push },
  { id: 'perps-gtm', status: perps },
  { id: 'predict-gtm', status: predict },
];

describe('startupSurfaceReducer', () => {
  it('keeps lower-priority surfaces blocked while push is resolving', () => {
    const state = getDefaultStartupSurfaceState();

    const nextState = startupSurfaceReducer(state, {
      surfaces: createSurfaces({ perps: 'eligible' }),
      type: 'updateSurfaces',
    });

    expect(nextState.activeSurfaceId).toBeNull();
  });

  it('activates push before Perps when both are eligible', () => {
    const withPushEligible = startupSurfaceReducer(
      getDefaultStartupSurfaceState(),
      {
        surfaces: createSurfaces({ perps: 'eligible', push: 'eligible' }),
        type: 'updateSurfaces',
      },
    );

    expect(withPushEligible.activeSurfaceId).toBe('push-pre-prompt');
  });

  it('queues Perps after push completes', () => {
    const withPushEligible = startupSurfaceReducer(
      getDefaultStartupSurfaceState(),
      {
        surfaces: createSurfaces({ perps: 'eligible', push: 'eligible' }),
        type: 'updateSurfaces',
      },
    );

    const afterPush = startupSurfaceReducer(withPushEligible, {
      surfaceId: 'push-pre-prompt',
      type: 'complete',
    });

    expect(afterPush.activeSurfaceId).toBe('perps-gtm');
  });

  it('activates Perps before Predict when push is ineligible', () => {
    const state = getDefaultStartupSurfaceState();
    const withPushIneligible = startupSurfaceReducer(state, {
      surfaces: createSurfaces({
        perps: 'eligible',
        predict: 'eligible',
        push: 'ineligible',
      }),
      type: 'updateSurfaces',
    });

    expect(withPushIneligible.activeSurfaceId).toBe('perps-gtm');
  });

  it('does not reactivate a completed surface in the same session', () => {
    const withPerpsEligible = startupSurfaceReducer(
      getDefaultStartupSurfaceState(),
      {
        surfaces: createSurfaces({ perps: 'eligible', push: 'ineligible' }),
        type: 'updateSurfaces',
      },
    );
    const afterPerps = startupSurfaceReducer(withPerpsEligible, {
      surfaceId: 'perps-gtm',
      type: 'complete',
    });
    const stillEligible = startupSurfaceReducer(afterPerps, {
      surfaces: createSurfaces({ perps: 'eligible', push: 'ineligible' }),
      type: 'updateSurfaces',
    });

    expect(stillEligible.activeSurfaceId).toBeNull();
  });

  it('clears the active surface if it moves back to resolving', () => {
    const withPushEligible = startupSurfaceReducer(
      getDefaultStartupSurfaceState(),
      {
        surfaces: createSurfaces({ push: 'eligible' }),
        type: 'updateSurfaces',
      },
    );

    const withPushResolving = startupSurfaceReducer(withPushEligible, {
      surfaces: createSurfaces({ push: 'resolving' }),
      type: 'updateSurfaces',
    });

    expect(withPushResolving.activeSurfaceId).toBeNull();
  });
});
