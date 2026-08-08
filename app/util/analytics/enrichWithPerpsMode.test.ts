import { PerpsMode } from '@metamask/perps-controller';
import { enrichWithPerpsMode } from './enrichWithPerpsMode';
import {
  getPerpsModeAnalyticsProperties,
  PERPS_MODE_ANALYTICS_PROPERTY,
} from '../../components/UI/Perps/utils/perpsAnalyticsAttribution';

jest.mock('../../components/UI/Perps/utils/perpsAnalyticsAttribution', () => ({
  PERPS_MODE_ANALYTICS_PROPERTY: 'perps_mode',
  getPerpsModeAnalyticsProperties: jest.fn(() => ({
    perps_mode: 'lite',
  })),
}));

const mockGetPerpsModeAnalyticsProperties = jest.mocked(
  getPerpsModeAnalyticsProperties,
);

describe('enrichWithPerpsMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPerpsModeAnalyticsProperties.mockReturnValue({
      [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
    });
  });

  it('injects Lite/Pro perps_mode onto Perp events', () => {
    const event = {
      name: 'Perp Screen Viewed',
      properties: { screen_type: 'trading' },
    };

    expect(enrichWithPerpsMode(event)).toEqual({
      name: 'Perp Screen Viewed',
      properties: {
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
        screen_type: 'trading',
      },
    });
  });

  it('does not modify non-Perps events', () => {
    const event = {
      name: 'Asset Viewed',
      properties: { trade_type: 'Perps' },
    };

    expect(enrichWithPerpsMode(event)).toBe(event);
    expect(mockGetPerpsModeAnalyticsProperties).not.toHaveBeenCalled();
  });

  it('lets an explicit perps_mode property win over the injected value', () => {
    const event = {
      name: 'Perp UI Interaction',
      properties: {
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
      },
    };

    expect(enrichWithPerpsMode(event).properties).toEqual({
      [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
    });
  });
});
