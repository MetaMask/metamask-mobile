import type { RootState } from '../../../../reducers';
import type { CollectiblesControllerState } from '../controllers/CollectiblesController';
import { selectCollectiblesHasCompletedOnboarding } from './onboarding';

const createState = (
  controllerState?: Partial<CollectiblesControllerState>,
): RootState =>
  ({
    engine: { backgroundState: { CollectiblesController: controllerState } },
  }) as RootState;

describe('selectCollectiblesHasCompletedOnboarding', () => {
  it.each([false, true])(
    'returns the wallet-wide completion flag (%s)',
    (value) => {
      const state = createState({ hasCompletedOnboarding: value });

      expect(selectCollectiblesHasCompletedOnboarding(state)).toBe(value);
    },
  );

  it.each([undefined, { packPartner: { operations: {}, sales: {} } }])(
    'requires onboarding before initialization or for a legacy state (%j)',
    (controllerState) => {
      const state = createState(controllerState);

      expect(selectCollectiblesHasCompletedOnboarding(state)).toBe(false);
    },
  );
});
