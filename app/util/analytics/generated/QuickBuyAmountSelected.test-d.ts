import { createQuickBuyAmountSelected } from './QuickBuyAmountSelected';

declare const transport: Parameters<typeof createQuickBuyAmountSelected>[0];

const event = createQuickBuyAmountSelected(transport);

event.v1.track({
  amount_selection_method: 'preset',
  amount_usd: 1,
  source: 'notification',
});

event.v2.track({
  amount_selection_method: 'preset',
  amount_usd: 1,
  source: 'notification',
});

// @ts-expect-error source is required
event.v2.track({
  amount_selection_method: 'custom_input',
  amount_usd: 1,
});

event.v2.track({
  amount_selection_method: 'preset',
  amount_usd: 1,
  source: 'notification',
  // @ts-expect-error unknown properties are rejected
  unknown_property: true,
});

event.v1.track({
  // @ts-expect-error slider is not a v1 amount selection method
  amount_selection_method: 'slider',
  amount_usd: 1,
  source: 'notification',
});

// @ts-expect-error only generated versions are available
event.v3.track({});
