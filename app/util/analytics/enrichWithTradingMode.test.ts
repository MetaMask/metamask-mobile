import { PerpsMode } from '@metamask/perps-controller';
import { enrichWithTradingMode } from './enrichWithTradingMode';
import {
  getTradingModeAnalyticsProperties,
  TRADING_MODE_ANALYTICS_PROPERTY,
} from '../../components/UI/Perps/utils/perpsAnalyticsAttribution';

jest.mock('../../components/UI/Perps/utils/perpsAnalyticsAttribution', () => ({
  TRADING_MODE_ANALYTICS_PROPERTY: 'trading_mode',
  getTradingModeAnalyticsProperties: jest.fn(() => ({
    trading_mode: 'lite',
  })),
}));

const mockGetTradingModeAnalyticsProperties = jest.mocked(
  getTradingModeAnalyticsProperties,
);

describe('enrichWithTradingMode', () => {
  beforeEach(() => {
    mockGetTradingModeAnalyticsProperties.mockReturnValue({
      [TRADING_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
    });
  });

  it('injects Lite/Pro trading_mode onto Perp events', () => {
    const event = {
      name: 'Perp Screen Viewed',
      properties: { screen_type: 'perps_home' },
    };

    expect(enrichWithTradingMode(event)).toEqual({
      name: 'Perp Screen Viewed',
      properties: {
        screen_type: 'perps_home',
        [TRADING_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
      },
    });
  });

  it('leaves non-Perp events untouched', () => {
    const event = {
      name: 'Button Clicked',
      properties: { button_name: 'swap' },
    };

    expect(enrichWithTradingMode(event)).toBe(event);
  });

  it('lets an explicit trading_mode property win over the injected value', () => {
    const event = {
      name: 'Perp UI Interaction',
      properties: {
        [TRADING_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
      },
    };

    expect(enrichWithTradingMode(event).properties).toEqual({
      [TRADING_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
    });
  });
});
