import { useEffect, useRef } from 'react';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';

/**
 * Records `alert_trigger_name` (and the sibling alert properties) for whatever
 * is currently in the confirmation alert context.
 *
 * This deliberately does not live in `Footer`. The footer returns `null` for
 * every type in `HIDE_FOOTER_BY_DEFAULT_TYPES` — money account deposit and
 * withdraw, perps and predict deposit and withdraw, membership subscription —
 * because `isFooterVisible` is never set to `true` anywhere. Those flows use
 * `CustomAmountConfirmButton` instead. While this effect lived inside the
 * footer those eight transaction types silently wrote no alert metrics at all,
 * so alerts that only ever block the amount keypad (`deposit_limit`,
 * `fiat_buy_amount_limit`) never reached Mixpanel.
 *
 * Rendering `null` as a sibling of the confirmation content keeps the alert
 * state subscription off the main confirmation tree, so a changing alert list
 * re-renders this leaf rather than the whole screen.
 *
 * The dispatch is deferred to the next macrotask and coalesced, instead of
 * running inside the passive effect. Several confirmation components subscribe
 * to `confirmationMetrics`, so a synchronous dispatch here re-renders them in
 * the same commit chain. If the alert list keeps changing between commits,
 * every iteration adds to React's nested update counter, and after 50 the
 * root throws "Maximum update depth exceeded" and unmounts the confirmation.
 * Writing from a timeout starts a new task, which resets that counter, so this
 * effect can no longer feed such a loop. Metrics are only read when the
 * transaction or signature event fires, which is always later than one tick.
 */
export function ConfirmationAlertMetrics() {
  const { alerts } = useAlerts();
  const { trackAlertMetrics } = useConfirmationAlertMetrics();

  // Always points at the latest callback, so the deferred write records the
  // alert state at flush time rather than at schedule time.
  const trackAlertMetricsRef = useRef(trackAlertMetrics);
  trackAlertMetricsRef.current = trackAlertMetrics;

  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // A write is already scheduled and will read the latest state, so skip.
    if (pendingTimeoutRef.current) {
      return;
    }

    pendingTimeoutRef.current = setTimeout(() => {
      pendingTimeoutRef.current = undefined;
      trackAlertMetricsRef.current();
    }, 0);
  }, [alerts, trackAlertMetrics]);

  useEffect(
    () => () => {
      // Flush on unmount so the last alert state is not lost when the
      // confirmation closes within the same tick.
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = undefined;
        trackAlertMetricsRef.current();
      }
    },
    [],
  );

  return null;
}
