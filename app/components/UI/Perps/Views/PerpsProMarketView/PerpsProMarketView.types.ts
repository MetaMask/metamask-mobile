/**
 * Which column a Pro-mode panel occupies in the two-column trading area.
 */
export type PerpsPanelPosition = 'left' | 'right';

/**
 * Placement config for the Pro-mode two-column trading area.
 *
 * Currently a static default (order form left, order book right). Once the
 * `@metamask/perps-controller` package is bumped, this will be fed by
 * `proLayoutPreferences.orderFormPosition` / `orderBookPosition`, enabling a
 * future container-position / rearrangeable-tiles feature without changing the
 * panel components themselves.
 */
export interface PerpsProLayoutConfig {
  orderFormPosition: PerpsPanelPosition;
  orderBookPosition: PerpsPanelPosition;
}

/**
 * Default two-column placement matching Figma node 10041:12979.
 */
export const DEFAULT_PRO_LAYOUT_CONFIG: PerpsProLayoutConfig = {
  orderFormPosition: 'left',
  orderBookPosition: 'right',
};

/**
 * Resolves persisted panel positions into a renderable two-column layout.
 *
 * Both Core fields are retained for preference parity. During rehydration or
 * migration they may temporarily conflict; in that case the Figma default is
 * used so both panels remain visible.
 *
 * @param config - Persisted order-form and order-book positions.
 * @returns Opposing positions safe to render.
 */
export const resolvePerpsProLayoutConfig = (
  config: PerpsProLayoutConfig,
): PerpsProLayoutConfig =>
  config.orderFormPosition !== config.orderBookPosition
    ? config
    : DEFAULT_PRO_LAYOUT_CONFIG;
