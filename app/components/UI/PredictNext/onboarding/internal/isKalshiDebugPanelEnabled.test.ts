import {
  DEFAULT_PREDICT_CONFIG,
  type PredictConfig,
} from '../../config/predictConfig';
import { isKalshiDebugPanelEnabled } from './isKalshiDebugPanelEnabled';

const kalshiOn: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: false },
};

describe('isKalshiDebugPanelEnabled', () => {
  it('returns true for a development build with Kalshi authentication on', () => {
    const enabled = isKalshiDebugPanelEnabled(true, kalshiOn);

    expect(enabled).toBe(true);
  });

  it('returns false for a release build even when Kalshi authentication is on', () => {
    const enabled = isKalshiDebugPanelEnabled(false, kalshiOn);

    expect(enabled).toBe(false);
  });

  it('returns false when the Kalshi venue is off', () => {
    const enabled = isKalshiDebugPanelEnabled(true, {
      ...kalshiOn,
      venues: {
        ...kalshiOn.venues,
        kalshi: { enabled: false },
      },
    });

    expect(enabled).toBe(false);
  });

  it('returns false when Predict is off', () => {
    const enabled = isKalshiDebugPanelEnabled(true, {
      ...kalshiOn,
      enabled: false,
    });

    expect(enabled).toBe(false);
  });

  it('returns false when the selected auth profile is not bundled', () => {
    const enabled = isKalshiDebugPanelEnabled(true, {
      ...kalshiOn,
      venues: {
        ...kalshiOn.venues,
        kalshi: { enabled: true, authProfileId: 'server-defined-profile' },
      },
    });

    expect(enabled).toBe(false);
  });

  it('returns false for the default predict config', () => {
    const enabled = isKalshiDebugPanelEnabled(true, DEFAULT_PREDICT_CONFIG);

    expect(enabled).toBe(false);
  });
});
