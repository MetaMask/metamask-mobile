import type { RootState } from '../../../../reducers';
import type { DeepPartial } from '../../../../util/test/renderWithProvider';
import { selectPredictCanSetup, selectPredictCanTrade } from './predictSession';

const buildState = (
  status?: 'setup_required' | 'ready',
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: status
      ? {
          PredictSessionService: {
            accountReadiness: { venueId: 'kalshi', status },
            requestStatus: 'success',
          },
        }
      : {},
  },
});

describe('Predict Session selectors', () => {
  it('allows setup only when the readiness projection requires setup', () => {
    const state = buildState('setup_required') as RootState;

    expect(selectPredictCanSetup(state)).toBe(true);
    expect(selectPredictCanTrade(state)).toBe(false);
  });

  it('allows trading only when the readiness projection is ready', () => {
    const state = buildState('ready') as RootState;

    expect(selectPredictCanSetup(state)).toBe(false);
    expect(selectPredictCanTrade(state)).toBe(true);
  });

  it('fails closed when session state is unavailable', () => {
    const state = buildState() as RootState;

    expect(selectPredictCanSetup(state)).toBe(false);
    expect(selectPredictCanTrade(state)).toBe(false);
  });
});
