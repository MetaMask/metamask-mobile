import type { AnalyticsExpectations } from '../../../framework';

const GEO_BLOCKED_TRIGGERED = 'Geo Blocked Triggered';

export const geoBlockedPredictActionExpectations: AnalyticsExpectations = {
  eventNames: [GEO_BLOCKED_TRIGGERED],
  events: [
    {
      name: GEO_BLOCKED_TRIGGERED,
      requiredDefinedPropertyKeys: ['country'],
      containProperties: { attempted_action: 'predict_action' },
    },
  ],
};

export const geoBlockedCashoutExpectations: AnalyticsExpectations = {
  eventNames: [GEO_BLOCKED_TRIGGERED],
  events: [
    {
      name: GEO_BLOCKED_TRIGGERED,
      requiredDefinedPropertyKeys: ['country'],
      containProperties: { attempted_action: 'cashout' },
    },
  ],
};

export const geoBlockedDepositExpectations: AnalyticsExpectations = {
  eventNames: [GEO_BLOCKED_TRIGGERED],
  events: [
    {
      name: GEO_BLOCKED_TRIGGERED,
      requiredDefinedPropertyKeys: ['country'],
      containProperties: { attempted_action: 'deposit' },
    },
  ],
};
