import { getDefaultAnalyticsControllerState } from '@metamask/analytics-controller';
import { RootState } from '../reducers';
import {
  selectAnalyticsOptedInToMarketing,
  selectMarketingConsentDecisionMade,
} from './analyticsController';

function buildState(analyticsState?: Record<string, unknown>): RootState {
  return {
    engine: {
      backgroundState: {
        ...(analyticsState === undefined
          ? {}
          : {
              AnalyticsController: {
                ...getDefaultAnalyticsControllerState(),
                analyticsId: '59710bcf-06cc-4247-9386-12425e7fc905',
                ...analyticsState,
              },
            }),
      },
    },
  } as RootState;
}

describe('analyticsController marketing selectors', () => {
  it('reads marketing opt-in from controller state', () => {
    expect(
      selectAnalyticsOptedInToMarketing(
        buildState({ optedInToMarketing: true }),
      ),
    ).toBe(true);
    expect(
      selectAnalyticsOptedInToMarketing(
        buildState({ optedInToMarketing: false }),
      ),
    ).toBe(false);
  });

  it('reads whether a marketing consent decision was made', () => {
    expect(
      selectMarketingConsentDecisionMade(
        buildState({ marketingConsentDecisionMade: true }),
      ),
    ).toBe(true);
    expect(
      selectMarketingConsentDecisionMade(
        buildState({ marketingConsentDecisionMade: false }),
      ),
    ).toBe(false);
  });

  it('returns undefined when controller state is missing', () => {
    const state = buildState();

    expect(selectAnalyticsOptedInToMarketing(state)).toBeUndefined();
    expect(selectMarketingConsentDecisionMade(state)).toBeUndefined();
  });
});
