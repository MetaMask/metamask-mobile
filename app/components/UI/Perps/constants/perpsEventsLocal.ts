/*
 * Interim, mobile-local perps analytics constants.
 *
 * The single source of truth for perps event constants is
 * `packages/perps-controller/src/constants/eventNames.ts` in the MetaMask/core
 * monorepo (published as `@metamask/perps-controller`). These values are not in
 * the currently installed package version, so they live here temporarily to
 * avoid blocking UI work on a cross-repo package release.
 *
 * TODO(TAT-3430): once `@metamask/perps-controller` ships these (TAT-3429),
 * replace usages with `PERPS_EVENT_VALUE.INTERACTION_TYPE.TPSL_ROE_SIGN_TOGGLED`
 * and `PERPS_EVENT_PROPERTY.ROE_SIGN`, then delete this file.
 */

/** `interaction_type` value for the Auto Close RoE sign toggle. */
export const TPSL_ROE_SIGN_TOGGLED_INTERACTION = 'tpsl_roe_sign_toggled';

/** Event property key carrying the toggled RoE sign (`'+'` | `'-'`). */
export const TPSL_ROE_SIGN_PROPERTY = 'roe_sign';
