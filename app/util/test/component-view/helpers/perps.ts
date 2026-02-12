import { strings } from '../../../../../locales/i18n';

/**
 * Shared test IDs and labels for Perps component/view tests.
 * Import only what you need (modify action, order type, etc.) so tests stay decoupled.
 */

// ----- Modify action sheet (PerpsSelectModifyActionView, PerpsModifyActionSheet) -----

export const modifyActionTestIds = {
  sheet: 'modify-action-sheet',
  positionSymbol: 'position-symbol',
  addPosition: 'add-to-position',
  reducePosition: 'reduce-position',
  flipPosition: 'flip-position',
  closeButton: 'close-button',
} as const;

/** Labels from i18n (same keys as PerpsModifyActionSheet). */
export function getModifyActionLabels() {
  return {
    title: strings('perps.modify.title'),
    addPosition: strings('perps.modify.add_to_position'),
    reducePosition: strings('perps.modify.reduce_position'),
    flipPosition: strings('perps.modify.flip_position'),
    close: strings('navigation.close'),
  };
}

// ----- Order type (PerpsSelectOrderTypeView) -----

export const orderTypeTestIds = {
  sheet: 'order-type-bottom-sheet',
  currentType: 'current-type',
  asset: 'asset',
  direction: 'direction',
  selectMarket: 'select-market',
  selectLimit: 'select-limit',
  closeButton: 'close-button',
} as const;

export const orderTypeLabels = {
  title: 'Select Order Type',
  market: 'Market',
  limit: 'Limit',
  close: 'Close',
} as const;

export function orderTypeCurrentTypeLabel(orderType: string): string {
  return `Current: ${orderType}`;
}

export function orderTypeAssetLabel(asset: string): string {
  return `Asset: ${asset}`;
}

export function orderTypeDirectionLabel(direction: string): string {
  return `Direction: ${direction}`;
}
