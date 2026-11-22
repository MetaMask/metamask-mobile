import { PERPS_ANALYTICS_SIZE_UNIT } from './perpsAnalytics';

describe('perpsAnalytics', () => {
  it('exports size_unit as the Segment property name', () => {
    expect(PERPS_ANALYTICS_SIZE_UNIT).toBe('size_unit');
  });
});
