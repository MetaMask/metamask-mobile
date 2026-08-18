import {
  getLimitPriceCrossingWarning,
  getRequiredTriggerSide,
  getTriggerPriceValidationIssue,
  getTriggerPriceValidationMessage,
  isTriggerFormPriceMessage,
} from './triggerOrderValidation';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('getRequiredTriggerSide', () => {
  it.each([
    ['stop_market', 'long', 'above'],
    ['stop_limit', 'short', 'below'],
    ['take_profit_market', 'long', 'below'],
    ['take_profit_limit', 'short', 'above'],
  ] as const)(
    'returns %s %s must be %s mid',
    (orderType, direction, requiredSide) => {
      expect(getRequiredTriggerSide(orderType, direction)).toBe(requiredSide);
    },
  );
});

describe('getTriggerPriceValidationIssue', () => {
  const base = {
    orderType: 'stop_market' as const,
    direction: 'long' as const,
    midPrice: 2500,
  };

  it('returns undefined for non-trigger order types', () => {
    const issue = getTriggerPriceValidationIssue({
      ...base,
      orderType: 'market',
      triggerPrice: '1000',
    });

    expect(issue).toBeUndefined();
  });

  it('returns required when the trigger price is empty', () => {
    const issue = getTriggerPriceValidationIssue({
      ...base,
      triggerPrice: '  ',
    });

    expect(issue).toEqual({ code: 'required' });
  });

  it('returns positive when the trigger price is zero or non-numeric', () => {
    expect(
      getTriggerPriceValidationIssue({ ...base, triggerPrice: '0' }),
    ).toEqual({ code: 'positive' });
    expect(
      getTriggerPriceValidationIssue({ ...base, triggerPrice: 'abc' }),
    ).toEqual({ code: 'positive' });
  });

  it('returns undefined when mid is missing even if the trigger is set', () => {
    const issue = getTriggerPriceValidationIssue({
      ...base,
      triggerPrice: '2600',
      midPrice: 0,
    });

    expect(issue).toBeUndefined();
  });

  it('returns wrong_side when a long stop trigger equals mid', () => {
    const issue = getTriggerPriceValidationIssue({
      ...base,
      triggerPrice: '2500',
    });

    expect(issue).toEqual({
      code: 'wrong_side',
      family: 'stop',
      requiredSide: 'above',
    });
  });

  it('accepts a long stop trigger strictly above mid', () => {
    const issue = getTriggerPriceValidationIssue({
      ...base,
      triggerPrice: '2500.01',
    });

    expect(issue).toBeUndefined();
  });

  it('returns wrong_side when a short take trigger is at or below mid', () => {
    const issue = getTriggerPriceValidationIssue({
      orderType: 'take_profit_market',
      direction: 'short',
      triggerPrice: '2499',
      midPrice: 2500,
    });

    expect(issue).toEqual({
      code: 'wrong_side',
      family: 'take_profit',
      requiredSide: 'above',
    });
  });

  it('accepts a long take trigger strictly below mid', () => {
    const issue = getTriggerPriceValidationIssue({
      orderType: 'take_profit_limit',
      direction: 'long',
      triggerPrice: '2499',
      midPrice: 2500,
    });

    expect(issue).toBeUndefined();
  });
});

describe('getTriggerPriceValidationMessage', () => {
  it('maps required and positive issues to existing error keys', () => {
    expect(getTriggerPriceValidationMessage({ code: 'required' })).toBe(
      'perps.order.validation.please_set_a_trigger_price',
    );
    expect(getTriggerPriceValidationMessage({ code: 'positive' })).toBe(
      'perps.errors.orderValidation.triggerPricePositive',
    );
  });

  it('maps stop and take wrong-side issues to direction copy', () => {
    expect(
      getTriggerPriceValidationMessage({
        code: 'wrong_side',
        family: 'stop',
        requiredSide: 'above',
      }),
    ).toBe('perps.order.validation.trigger_must_be_above_mid');
    expect(
      getTriggerPriceValidationMessage({
        code: 'wrong_side',
        family: 'take_profit',
        requiredSide: 'below',
      }),
    ).toBe('perps.order.validation.trigger_must_be_below_mid');
  });
});

describe('getLimitPriceCrossingWarning', () => {
  it('warns when a long limit is above mid', () => {
    const warning = getLimitPriceCrossingWarning({
      orderType: 'limit',
      direction: 'long',
      limitPrice: '2600',
      midPrice: 2500,
    });

    expect(warning).toBe('perps.order.validation.limit_price_above_warning');
  });

  it('warns when a short trigger-limit is below mid', () => {
    const warning = getLimitPriceCrossingWarning({
      orderType: 'stop_limit',
      direction: 'short',
      limitPrice: '2400',
      midPrice: 2500,
    });

    expect(warning).toBe('perps.order.validation.limit_price_below_warning');
  });

  it('returns undefined when the limit does not cross mid', () => {
    expect(
      getLimitPriceCrossingWarning({
        orderType: 'limit',
        direction: 'long',
        limitPrice: '2500',
        midPrice: 2500,
      }),
    ).toBeUndefined();
    expect(
      getLimitPriceCrossingWarning({
        orderType: 'market',
        direction: 'long',
        limitPrice: '2600',
        midPrice: 2500,
      }),
    ).toBeUndefined();
  });
});

describe('isTriggerFormPriceMessage', () => {
  it('recognizes trigger helper copy and omits unrelated notices', () => {
    expect(
      isTriggerFormPriceMessage(
        'perps.order.validation.please_set_a_trigger_price',
      ),
    ).toBe(true);
    expect(
      isTriggerFormPriceMessage(
        'perps.order.validation.trigger_must_be_below_mid',
      ),
    ).toBe(true);
    expect(
      isTriggerFormPriceMessage('perps.order.validation.insufficient_funds'),
    ).toBe(false);
  });
});
