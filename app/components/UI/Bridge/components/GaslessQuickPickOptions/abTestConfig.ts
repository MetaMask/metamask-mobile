import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const NUMPAD_QUICK_ACTIONS_AB_KEY =
  'swapsSWAPS4135AbtestNumpadQuickAmounts';

export enum NumpadQuickActionsVariant {
  Control = 'control',
  Treatment = 'treatment',
}
export type NumpadQuickAction = number | 'MAX';

// Some unit tests fully mock `@metamask/bridge-controller` without this enum.
// Resolve event names defensively so unrelated imports do not crash at module load.
const getBridgeEventNames = (
  ...eventKeys: (keyof typeof UnifiedSwapBridgeEventName)[]
) =>
  eventKeys.flatMap((eventKey) => {
    const eventName = UnifiedSwapBridgeEventName?.[eventKey];

    return eventName ? [eventName] : [];
  });

export const NUMPAD_QUICK_ACTIONS_VARIANTS: Record<
  NumpadQuickActionsVariant,
  readonly NumpadQuickAction[]
> = {
  [NumpadQuickActionsVariant.Control]: [25, 50, 75, 'MAX'],
  [NumpadQuickActionsVariant.Treatment]: [50, 75, 90, 'MAX'],
};

export const NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS: Record<
  NumpadQuickActionsVariant,
  readonly number[]
> = {
  [NumpadQuickActionsVariant.Control]: [25, 50, 75, 90],
  [NumpadQuickActionsVariant.Treatment]: [50, 75, 85, 95],
};

export const NUMPAD_QUICK_ACTIONS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: NUMPAD_QUICK_ACTIONS_AB_KEY,
    validVariants: Object.values(NumpadQuickActionsVariant),
    eventNames: [
      ...getBridgeEventNames('InputChanged'),
      EVENT_NAME.SWAP_PAGE_VIEWED,
    ],
  };
