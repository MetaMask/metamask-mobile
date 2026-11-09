import { createQuickBuyAmountSelected } from './QuickBuyAmountSelected';

describe('createQuickBuyAmountSelected', () => {
  it('tracks v1 with the event version context', () => {
    const transport = {
      track: jest.fn(),
    };
    const event = createQuickBuyAmountSelected(transport);
    const properties = {
      amount_selection_method: 'preset' as const,
      amount_usd: 50,
      source: 'notification' as const,
    };

    event.v1.track(properties);

    expect(transport.track).toHaveBeenCalledWith(
      'Quick Buy Amount Selected',
      properties,
      {
        protocols: {
          event_version: 1,
        },
      },
    );
  });

  it('tracks v2 with the event version context', () => {
    const transport = {
      track: jest.fn(),
    };
    const event = createQuickBuyAmountSelected(transport);
    const properties = {
      amount_selection_method: 'slider' as const,
      amount_usd: 50,
      slider_percent: 25,
      source: 'trader_feed' as const,
    };

    event.v2.track(properties);

    expect(transport.track).toHaveBeenCalledWith(
      'Quick Buy Amount Selected',
      properties,
      {
        protocols: {
          event_version: 2,
        },
      },
    );
  });
});
