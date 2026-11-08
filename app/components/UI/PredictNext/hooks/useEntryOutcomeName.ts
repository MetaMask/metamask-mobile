import { formatThresholdOutcome } from '../events/shared/formatting';
import type { PredictEntityId, PredictPosition } from '../types';
import { getOutcomeName } from '../utils/entryCopy';
import { useEvent } from './useEvent';

/** The fields a Position, Trade or Settlement shares that name its Outcome. */
export type PredictEntryOutcomeRef = Pick<
  PredictPosition,
  'venueId' | 'marketId' | 'side' | 'context'
>;

/**
 * Names an entry's Outcome for lists and details outside the Event screen.
 * A threshold line's Outcome is only "Yes" or "No", so it also names the line
 * from the entry's catalog Market: "Yes · Josh Jacobs · 60+". The Market is
 * read from the entry's catalog Event (the Event screen's cached read); until
 * it loads, or when the entry has no catalog context or the Market is not in
 * the Event, the name is the Outcome label alone.
 *
 * @param entry - The Position, Trade or Settlement, or `undefined` to skip.
 * @returns The Outcome name, or `undefined` without an entry.
 */
export function useEntryOutcomeName(entry: PredictEntryOutcomeRef): string;
export function useEntryOutcomeName(
  entry: PredictEntryOutcomeRef | undefined,
): string | undefined;
export function useEntryOutcomeName(
  entry: PredictEntryOutcomeRef | undefined,
): string | undefined {
  const eventId = entry?.context?.eventId;
  const { data: event } = useEvent(
    entry?.venueId ?? ('' as PredictEntryOutcomeRef['venueId']),
    eventId ?? ('' as PredictEntityId),
    { enabled: entry !== undefined && eventId !== undefined },
  );
  if (!entry) {
    return undefined;
  }
  const outcome = getOutcomeName(entry.side, entry.context);
  const market = event?.markets.find(
    (candidate) => candidate.id === entry.marketId,
  );
  return (market && formatThresholdOutcome(market, outcome)) ?? outcome;
}
