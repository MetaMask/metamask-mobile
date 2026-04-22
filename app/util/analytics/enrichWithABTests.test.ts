import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import { enrichWithABTests } from './enrichWithABTests';

describe('enrichWithABTests', () => {
  it('injects one active assignment for a matching allowlisted event', () => {
    const event = AnalyticsEventBuilder.createEventBuilder('Card Button Viewed')
      .addProperties({
        screen: 'wallet',
      })
      .build();

    const result = enrichWithABTests(event, {
      cardCARD338AbtestAttentionBadge: 'withBadge',
    });

    expect(result.properties).toMatchObject({
      screen: 'wallet',
      active_ab_tests: [
        { key: 'cardCARD338AbtestAttentionBadge', value: 'withBadge' },
      ],
    });
  });

  it('injects multiple assignments when multiple tests match the same event', () => {
    const event = AnalyticsEventBuilder.createEventBuilder(
      'Unified SwapBridge Page Viewed',
    ).build();

    const result = enrichWithABTests(event, {
      swapsSWAPS4135AbtestNumpadQuickAmounts: { name: 'treatment' },
      swapsSWAPS4242AbtestTokenSelectorBalanceLayout: 'control',
    });

    expect(result.properties.active_ab_tests).toEqual([
      {
        key: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
        value: 'treatment',
      },
      {
        key: 'swapsSWAPS4242AbtestTokenSelectorBalanceLayout',
        value: 'control',
      },
    ]);
  });

  it('does nothing when the event is not allowlisted', () => {
    const event = AnalyticsEventBuilder.createEventBuilder('Unrelated Event')
      .addProperties({
        source: 'test',
      })
      .build();

    const result = enrichWithABTests(event, {
      cardCARD338AbtestAttentionBadge: 'withBadge',
    });

    expect(result.properties).toEqual({
      source: 'test',
    });
  });

  it('ignores missing and invalid flag values', () => {
    const event = AnalyticsEventBuilder.createEventBuilder(
      'Unified SwapBridge Page Viewed',
    ).build();

    const result = enrichWithABTests(event, {
      swapsSWAPS4135AbtestNumpadQuickAmounts: 42,
      swapsSWAPS4242AbtestTokenSelectorBalanceLayout: 'unknown',
    });

    expect(result.properties).toEqual({});
  });

  it('supports both string flags and controller object flags', () => {
    const event =
      AnalyticsEventBuilder.createEventBuilder('Card Button Viewed').build();

    const result = enrichWithABTests(event, {
      cardCARD338AbtestAttentionBadge: { name: 'control' },
    });

    expect(result.properties.active_ab_tests).toEqual([
      { key: 'cardCARD338AbtestAttentionBadge', value: 'control' },
    ]);
  });

  it('merges with existing active_ab_tests and preserves explicit payload values', () => {
    const event = AnalyticsEventBuilder.createEventBuilder(
      'Unified SwapBridge Page Viewed',
    )
      .addProperties({
        active_ab_tests: [
          {
            key: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
            value: 'manual-value',
          },
        ],
        quote_count: 3,
      })
      .build();

    const result = enrichWithABTests(event, {
      swapsSWAPS4135AbtestNumpadQuickAmounts: 'treatment',
      swapsSWAPS4242AbtestTokenSelectorBalanceLayout: 'treatment',
    });

    expect(result.properties).toEqual({
      quote_count: 3,
      active_ab_tests: [
        {
          key: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
          value: 'manual-value',
        },
        {
          key: 'swapsSWAPS4242AbtestTokenSelectorBalanceLayout',
          value: 'treatment',
        },
      ],
    });
  });

  it('enriches Home Viewed events with hub page discovery tabs assignment', () => {
    const event =
      AnalyticsEventBuilder.createEventBuilder('Home Viewed').build();

    const result = enrichWithABTests(event, {
      coreMCU589AbtestHubPageDiscoveryTabs: 'treatment',
    });

    expect(result.properties.active_ab_tests).toEqual([
      { key: 'coreMCU589AbtestHubPageDiscoveryTabs', value: 'treatment' },
    ]);
  });

  it('leaves non-A/B properties and sensitive properties unchanged', () => {
    const event = AnalyticsEventBuilder.createEventBuilder('Card Button Viewed')
      .addProperties({
        button_type: 'card',
      })
      .addSensitiveProperties({
        sensitive: 'value',
      })
      .build();

    const result = enrichWithABTests(event, {
      cardCARD338AbtestAttentionBadge: 'control',
    });

    expect(result.properties.button_type).toBe('card');
    expect(result.sensitiveProperties).toEqual({ sensitive: 'value' });
    expect(result.saveDataRecording).toBe(false);
  });
});
