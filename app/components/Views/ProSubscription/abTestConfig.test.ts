import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../util/analytics/abTestAnalyticsRegistry';
import {
  JOIN_PRO_PAYWALL_AB_TEST_ANALYTICS_MAPPING,
  JOIN_PRO_PAYWALL_AB_TEST_KEY,
  JOIN_PRO_PAYWALL_VARIANTS,
  PRO_SUBSCRIPTION_FLOW_AB_KEY,
} from './abTestConfig';

describe('Join Pro paywall A/B test config', () => {
  it('uses a dedicated SUB-1059 LaunchDarkly key', () => {
    expect(JOIN_PRO_PAYWALL_AB_TEST_KEY).toBe(
      'subSUB1059AbtestJoinProPaywallCopy',
    );
    expect(JOIN_PRO_PAYWALL_AB_TEST_KEY).not.toBe(PRO_SUBSCRIPTION_FLOW_AB_KEY);
  });

  it('declares control as the fallback and supports additional content versions', () => {
    expect(JOIN_PRO_PAYWALL_VARIANTS).toEqual({
      control: { contentVersion: 'control' },
      v2: { contentVersion: 'v2' },
    });
  });

  it('registers exposure variants without inventing business events', () => {
    expect(JOIN_PRO_PAYWALL_AB_TEST_ANALYTICS_MAPPING).toEqual({
      flagKey: JOIN_PRO_PAYWALL_AB_TEST_KEY,
      validVariants: ['control', 'v2'],
      eventNames: [],
    });
    expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
      JOIN_PRO_PAYWALL_AB_TEST_ANALYTICS_MAPPING,
    );
  });
});
