import type { MoneyEntryDecision } from '../navigation/moneyEntryDecision';

export type TrackMoneyEntry = (
  decision: Pick<MoneyEntryDecision, 'redirect_target' | 'button_intent'>,
) => void;
