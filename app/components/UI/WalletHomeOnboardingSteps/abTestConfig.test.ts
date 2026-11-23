import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../util/analytics/abTestAnalyticsRegistry';
import {
  FUND_STEP_RECEIVE_AB_KEY,
  FUND_STEP_RECEIVE_AB_TEST_ANALYTICS_MAPPING,
  FUND_STEP_RECEIVE_VARIANTS,
  FundStepReceiveVariant,
} from './abTestConfig';

describe('TMCU-1939 fund step Receive button A/B test', () => {
  it('defines control and treatment with control hiding the Receive button', () => {
    expect(FUND_STEP_RECEIVE_AB_KEY).toBe(
      'homeTMCU1939AbtestFundStepReceiveButton',
    );
    expect(Object.keys(FUND_STEP_RECEIVE_VARIANTS)).toEqual([
      FundStepReceiveVariant.Control,
      FundStepReceiveVariant.Treatment,
    ]);
    expect(FUND_STEP_RECEIVE_VARIANTS.control.showReceiveButton).toBe(false);
    expect(FUND_STEP_RECEIVE_VARIANTS.treatment.showReceiveButton).toBe(true);
  });

  it('reuses existing events and scopes each one to fund-step traffic', () => {
    const { eventNames, eventPropertyRequirements } =
      FUND_STEP_RECEIVE_AB_TEST_ANALYTICS_MAPPING;

    expect(eventNames).toEqual([
      EVENT_NAME.HOME_VIEWED,
      EVENT_NAME.RAMPS_BUTTON_CLICKED,
      EVENT_NAME.ACTION_BUTTON_CLICKED,
      EVENT_NAME.ADDRESS_LIST_VIEWED,
    ]);
    expect(eventPropertyRequirements).toEqual({
      [EVENT_NAME.HOME_VIEWED]: {
        interaction_type: 'onboarding_checklist',
        section_name: 'on_ramp',
      },
      [EVENT_NAME.RAMPS_BUTTON_CLICKED]: { location: 'onboarding_checklist' },
      [EVENT_NAME.ACTION_BUTTON_CLICKED]: {
        location: 'onboarding_checklist',
        action_name: 'receive',
      },
      [EVENT_NAME.ADDRESS_LIST_VIEWED]: { source: 'onboarding_checklist' },
    });
  });

  it('is registered for shared analytics enrichment', () => {
    expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
      FUND_STEP_RECEIVE_AB_TEST_ANALYTICS_MAPPING,
    );
  });
});
