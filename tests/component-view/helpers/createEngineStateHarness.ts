import type { Store } from '@reduxjs/toolkit';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';

type EngineState = typeof Engine.state;

/** Publishes a mocked controller state to Redux. Call cleanup in a finally block. */
export function createEngineStateHarness<Key extends keyof EngineState>(
  store: Pick<Store, 'dispatch'>,
  key: Key,
) {
  const mockEngine = Engine as { state?: Partial<EngineState> };
  const previousState = mockEngine.state;

  return {
    publish(state: EngineState[Key]) {
      mockEngine.state = { ...mockEngine.state, [key]: state };
      store.dispatch(updateBgState({ key }));
    },
    cleanup() {
      mockEngine.state = previousState;
    },
  };
}
