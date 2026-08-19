import {
  canonicalizeOrderPrice,
  getLimitPriceValidationIssue,
  getLimitPriceValidationMessage,
  getLimitPriceCrossingWarning,
  getOrderFormFieldIssues,
  getRequiredTriggerSide,
  getTriggerPriceValidationIssue,
  getTriggerPriceValidationMessage,
} from './triggerOrderValidation';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const triggerDirectionCases = [
  {
    orderType: 'stop_market',
    direction: 'long',
    family: 'stop',
    requiredSide: 'above',
    validTrigger: '2501',
    wrongSideTrigger: '2499',
  },
  {
    orderType: 'stop_market',
    direction: 'short',
    family: 'stop',
    requiredSide: 'below',
    validTrigger: '2499',
    wrongSideTrigger: '2501',
  },
  {
    orderType: 'stop_limit',
    direction: 'long',
    family: 'stop',
    requiredSide: 'above',
    validTrigger: '2501',
    wrongSideTrigger: '2499',
  },
  {
    orderType: 'stop_limit',
    direction: 'short',
    family: 'stop',
    requiredSide: 'below',
    validTrigger: '2499',
    wrongSideTrigger: '2501',
  },
  {
    orderType: 'take_profit_market',
    direction: 'long',
    family: 'take_profit',
    requiredSide: 'below',
    validTrigger: '2499',
    wrongSideTrigger: '2501',
  },
  {
    orderType: 'take_profit_market',
    direction: 'short',
    family: 'take_profit',
    requiredSide: 'above',
    validTrigger: '2501',
    wrongSideTrigger: '2499',
  },
  {
    orderType: 'take_profit_limit',
    direction: 'long',
    family: 'take_profit',
    requiredSide: 'below',
    validTrigger: '2499',
    wrongSideTrigger: '2501',
  },
  {
    orderType: 'take_profit_limit',
    direction: 'short',
    family: 'take_profit',
    requiredSide: 'above',
    validTrigger: '2501',
    wrongSideTrigger: '2499',
  },
] as const;

describe('getRequiredTriggerSide', () => {
  it.each(triggerDirectionCases)(
    'returns $requiredSide for $direction $orderType',
    ({ orderType, direction, requiredSide }) => {
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

  it.each(triggerDirectionCases)(
    'accepts $direction $orderType strictly $requiredSide mid',
    ({ orderType, direction, validTrigger }) => {
      const issue = getTriggerPriceValidationIssue({
        orderType,
        direction,
        triggerPrice: validTrigger,
        midPrice: 2500,
      });

      expect(issue).toBeUndefined();
    },
  );

  it.each(triggerDirectionCases)(
    'returns wrong_side for $direction $orderType on the opposite side of mid',
    ({ orderType, direction, family, requiredSide, wrongSideTrigger }) => {
      const issue = getTriggerPriceValidationIssue({
        orderType,
        direction,
        triggerPrice: wrongSideTrigger,
        midPrice: 2500,
      });

      expect(issue).toEqual({
        code: 'wrong_side',
        family,
        requiredSide,
      });
      expect(
        getTriggerPriceValidationMessage({
          code: 'wrong_side',
          family,
          requiredSide,
        }),
      ).toBe(
        requiredSide === 'above'
          ? 'perps.order.validation.trigger_must_be_above_mid'
          : 'perps.order.validation.trigger_must_be_below_mid',
      );
    },
  );

  it.each(triggerDirectionCases)(
    'returns wrong_side for $direction $orderType equal to mid',
    ({ orderType, direction, family, requiredSide }) => {
      const issue = getTriggerPriceValidationIssue({
        orderType,
        direction,
        triggerPrice: '2500',
        midPrice: 2500,
      });

      expect(issue).toEqual({
        code: 'wrong_side',
        family,
        requiredSide,
      });
    },
  );
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

  it('warns when a short trigger-limit is below its trigger', () => {
    const warning = getLimitPriceCrossingWarning({
      orderType: 'stop_limit',
      direction: 'short',
      limitPrice: '2400',
      midPrice: 2500,
      triggerPrice: '2450',
    });

    expect(warning).toBe(
      'perps.order.validation.trigger_limit_price_below_warning',
    );
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

describe('typed order price validation', () => {
  it('canonicalizes a price using venue precision', () => {
    const result = canonicalizeOrderPrice('123.456', 0);

    expect(result).toBe('123.46');
  });

  it('returns a blocking relationship issue when a long trigger-limit cannot fill', () => {
    const result = getLimitPriceValidationIssue({
      orderType: 'stop_limit',
      direction: 'long',
      triggerPrice: '2500',
      limitPrice: '2499',
      szDecimals: 3,
    });

    expect(result).toEqual({
      code: 'below_trigger',
      requiredRelation: 'at_or_above',
    });
    expect(
      getLimitPriceValidationMessage(
        result as {
          code: 'below_trigger';
          requiredRelation: 'at_or_above';
        },
      ),
    ).toBe('perps.order.validation.limit_price_must_be_at_or_above_trigger');
  });

  it('assigns trigger and limit issues to their owning fields', () => {
    const result = getOrderFormFieldIssues({
      orderType: 'stop_limit',
      direction: 'long',
      triggerPrice: '2400',
      limitPrice: '2300',
      midPrice: 2500,
      szDecimals: 3,
    });

    expect(result.map(({ field }) => field)).toEqual([
      'triggerPrice',
      'limitPrice',
    ]);
  });
});
