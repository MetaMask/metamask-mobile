import { useEffect } from 'react';
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
 */
export function ConfirmationAlertMetrics() {
  const { alerts } = useAlerts();
  const { trackAlertMetrics } = useConfirmationAlertMetrics();

  useEffect(() => {
    trackAlertMetrics();
  }, [alerts, trackAlertMetrics]);

  return null;
}
