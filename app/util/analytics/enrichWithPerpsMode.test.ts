import { PerpsMode } from '@metamask/perps-controller';
import { enrichWithPerpsMode } from './enrichWithPerpsMode';
import {
  getPerpsModeAnalyticsProperties,
  PERPS_MODE_ANALYTICS_PROPERTY,
} from '../../components/UI/Perps/utils/perpsModeAnalytics';

jest.mock('../../components/UI/Perps/utils/perpsModeAnalytics', () => ({
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
    mockGetPerpsModeAnalyticsProperties.mockReturnValue({
      [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
    });
  });

  it('injects Lite/Pro perps_mode onto Perp events', () => {
    const event = {
      name: 'Perp Screen Viewed',
      properties: { screen_type: 'perps_home' },
    };

    expect(enrichWithPerpsMode(event)).toEqual({
      name: 'Perp Screen Viewed',
      properties: {
        screen_type: 'perps_home',
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
      },
    });
  });

  it('injects perps_mode onto Perps Asset Viewed companion events', () => {
    mockGetPerpsModeAnalyticsProperties.mockReturnValue({
      [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
    });

    const event = {
      name: 'Asset Viewed',
      properties: {
        trade_type: 'Perps',
        screen_type: 'asset_details',
      },
    };

    expect(enrichWithPerpsMode(event)).toEqual({
      name: 'Asset Viewed',
      properties: {
        trade_type: 'Perps',
        screen_type: 'asset_details',
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
      },
    });
  });

  it('leaves non-Perp events untouched', () => {
    const event = {
      name: 'Button Clicked',
      properties: { button_name: 'swap' },
    };

    expect(enrichWithPerpsMode(event)).toBe(event);
  });

  it('leaves non-Perps Asset Viewed events untouched', () => {
    const event = {
      name: 'Asset Viewed',
      properties: { trade_type: 'Swaps' },
    };

    expect(enrichWithPerpsMode(event)).toBe(event);
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
