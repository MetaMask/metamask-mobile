import { UI_SLOTS_CONTRACT_MAJOR } from './config';
import type { UiSlotsConfigurationKey, UiSlotsScreenId } from './types';

/**
 * Partitions the persisted cache. The contract major is included so an app
 * update that moves to a new contract cannot read configurations written by the
 * previous one.
 */
export function buildUiSlotsConfigurationKey({
  screenId,
  locale,
}: {
  screenId: UiSlotsScreenId;
  locale: string;
}): UiSlotsConfigurationKey {
  return [screenId, encodeURIComponent(locale), UI_SLOTS_CONTRACT_MAJOR].join(
    ':',
  );
}
