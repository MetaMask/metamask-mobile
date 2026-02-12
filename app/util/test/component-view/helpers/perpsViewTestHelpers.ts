import { strings } from '../../../../../locales/i18n';

/**
 * Shared helpers for Perps component/view tests.
 * Add only what view tests need; use i18n (strings()) for any user-facing labels to stay consistent with the app.
 */

/** Labels from i18n (same keys as PerpsModifyActionSheet). Used by PerpsSelectModifyActionView.view.test. */
export function getModifyActionLabels() {
  return {
    title: strings('perps.modify.title'),
    addPosition: strings('perps.modify.add_to_position'),
    reducePosition: strings('perps.modify.reduce_position'),
    flipPosition: strings('perps.modify.flip_position'),
    close: strings('navigation.close'),
  };
}
