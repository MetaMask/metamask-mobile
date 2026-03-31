import type { AnalyticsTrackingEvent } from './AnalyticsEventBuilder';
import { enrichWithABTests } from './enrichWithABTests';

const createEvent = (
  name: string,
  properties: Record<string, unknown> = {},
): AnalyticsTrackingEvent => ({
  name,
  properties,
  sensitiveProperties: { sensitive: 'value' },
  saveDataRecording: false,
  get isAnonymous(): boolean {
    return true;
  },
  get hasProperties(): boolean {
    return (
      Object.keys(this.properties).length > 0 ||
      Object.keys(this.sensitiveProperties).length > 0
    );
  },
});

describe('enrichWithABTests', () => {
  it('injects one active assignment for a matching allowlisted event', () => {
    const event = createEvent('Card Button Viewed', {
      screen: 'wallet',
    });

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
    const event = createEvent('Unified SwapBridge Page Viewed');

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
    const event = createEvent('Unrelated Event', {
      source: 'test',
    });

    const result = enrichWithABTests(event, {
      cardCARD338AbtestAttentionBadge: 'withBadge',
    });

    expect(result.properties).toEqual({
      source: 'test',
    });
  });

  it('ignores missing and invalid flag values', () => {
    const event = createEvent('Unified SwapBridge Page Viewed');

    const result = enrichWithABTests(event, {
      swapsSWAPS4135AbtestNumpadQuickAmounts: 42,
      swapsSWAPS4242AbtestTokenSelectorBalanceLayout: 'unknown',
    });

    expect(result.properties).toEqual({});
  });

  it('supports both string flags and controller object flags', () => {
    const event = createEvent('Card Button Viewed');

    const result = enrichWithABTests(event, {
      cardCARD338AbtestAttentionBadge: { name: 'control' },
    });

    expect(result.properties.active_ab_tests).toEqual([
      { key: 'cardCARD338AbtestAttentionBadge', value: 'control' },
    ]);
  });

  it('merges with existing active_ab_tests and preserves explicit payload values', () => {
    const event = createEvent('Unified SwapBridge Page Viewed', {
      active_ab_tests: [
        {
          key: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
          value: 'manual-value',
        },
      ],
      quote_count: 3,
    });

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

  it('leaves non-A/B properties and sensitive properties unchanged', () => {
    const event = createEvent('Card Button Viewed', {
      button_type: 'card',
    });

    const result = enrichWithABTests(event, {
      cardCARD338AbtestAttentionBadge: 'control',
    });

    expect(result.properties.button_type).toBe('card');
    expect(result.sensitiveProperties).toEqual({ sensitive: 'value' });
    expect(result.saveDataRecording).toBe(false);
  });
});
