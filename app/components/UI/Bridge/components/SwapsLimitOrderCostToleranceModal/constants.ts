/**
 * Cost tolerance options in % offered on the default modal. Anything else is
 * entered through the custom modal.
 */
export const COST_TOLERANCE_OPTIONS = ['0.5', '2', '3'];

export const CUSTOM_COST_TOLERANCE_OPTION_ID = 'custom-cost-tolerance';

/**
 * Bounds, step and precision of the custom cost tolerance input, in %. A
 * cost tolerance of 0% or of 100% and above is rejected.
 */
export const COST_TOLERANCE_MIN = 0;
export const COST_TOLERANCE_MAX = 100;
export const COST_TOLERANCE_STEP = 0.1;
export const COST_TOLERANCE_MAX_DECIMALS = 2;
