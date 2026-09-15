import { PERPS_ANALYTICS_PREVIOUS_LEVERAGE } from './perpsAnalytics';

describe('perpsAnalytics', () => {
  it('exports previous_leverage as the Segment property name', () => {
    expect(PERPS_ANALYTICS_PREVIOUS_LEVERAGE).toBe('previous_leverage');
  });
});
