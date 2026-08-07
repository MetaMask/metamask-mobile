import { PERPS_EVENT_PROPERTY, PerpsMode } from '@metamask/perps-controller';
import { enrichWithPerpsMode } from './enrichWithPerpsMode';
import { getPerpsModeAnalyticsProperties } from '../../components/UI/Perps/utils/perpsAnalyticsAttribution';

jest.mock('../../components/UI/Perps/utils/perpsAnalyticsAttribution', () => ({
  getPerpsModeAnalyticsProperties: jest.fn(() => ({
    mode: 'lite',
  })),
}));

const mockGetPerpsModeAnalyticsProperties = jest.mocked(
  getPerpsModeAnalyticsProperties,
);

describe('enrichWithPerpsMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPerpsModeAnalyticsProperties.mockReturnValue({
      [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Lite,
    });
  });

  it('injects Lite/Pro mode onto Perp events', () => {
    const event = {
      name: 'Perp Screen Viewed',
      properties: { screen_type: 'trading' },
    };

    expect(enrichWithPerpsMode(event)).toEqual({
      name: 'Perp Screen Viewed',
      properties: {
        [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Lite,
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

  it('lets an explicit mode property win over the injected value', () => {
    const event = {
      name: 'Perp UI Interaction',
      properties: {
        [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Pro,
      },
    };

    expect(enrichWithPerpsMode(event).properties).toEqual({
      [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Pro,
    });
  });
});
