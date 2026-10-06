import type { RootState } from '../../../../reducers';
import type { GachaControllerState } from '../controllers/GachaController';
import { selectGachaHasCompletedOnboarding } from './onboarding';

const createState = (
  controllerState?: Partial<GachaControllerState>,
): RootState =>
  ({
    engine: { backgroundState: { GachaController: controllerState } },
  }) as RootState;

describe('selectGachaHasCompletedOnboarding', () => {
  it.each([false, true])(
    'returns the wallet-wide completion flag (%s)',
    (value) => {
      const state = createState({ hasCompletedOnboarding: value });

      expect(selectGachaHasCompletedOnboarding(state)).toBe(value);
    },
  );

  it.each([undefined, { collectorCrypt: { cards: {}, operations: {} } }])(
    'requires onboarding before initialization or for a legacy state (%j)',
    (controllerState) => {
      const state = createState(controllerState);

      expect(selectGachaHasCompletedOnboarding(state)).toBe(false);
    },
  );
});
