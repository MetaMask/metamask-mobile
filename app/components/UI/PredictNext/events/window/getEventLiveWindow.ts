import type {
  PredictCryptoUpDownWindow,
  PredictEvent,
  PredictMarket,
  PredictTimestamp,
} from '../../types';

/**
 * An Event that renders as a live timed window, such as a crypto Up/Down
 * round, instead of a standard Event. `startsAt` and `endsAt` are the clock
 * input of the window: pass them to the neutral `windowClock` module.
 */
export interface PredictEventLiveWindow {
  kind: PredictCryptoUpDownWindow['kind'];
  window: PredictCryptoUpDownWindow;
  /** The Event's open time. */
  startsAt: PredictTimestamp;
  /** The Event's close time. */
  endsAt: PredictTimestamp;
  /** The one Market that holds the Up (`yes`) and Down (`no`) Outcomes. */
  market: PredictMarket;
}

/**
 * The one rule that picks the Up/Down presentation for an Event.
 *
 * An Event is a live window when its parsed `window` is a known kind, it has
 * the open and close times the clock needs, and it has a Market. Anything
 * else is a standard Event, so a card or screen that gets `undefined` falls
 * back to the standard composition. The Kalshi feature flag is a separate
 * check made by the caller.
 */
export const getEventLiveWindow = (
  event: PredictEvent,
): PredictEventLiveWindow | undefined => {
  const { window: eventWindow, startsAt, closesAt, markets } = event;

  if (eventWindow?.kind !== 'crypto_up_down') {
    return undefined;
  }

  const [market] = markets;
  if (!startsAt || !closesAt || !market) {
    return undefined;
  }

  return {
    kind: eventWindow.kind,
    window: eventWindow,
    startsAt,
    endsAt: closesAt,
    market,
  };
};
