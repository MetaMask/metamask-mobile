/**
 * Reads the raw `MM_MONEY_VBA_DEBUG_PANEL` value. Kept in its own module so
 * Metro can inline it from `.js.env` while tests mock it.
 *
 * @returns The env value, or undefined when unset.
 */
export const readVbaDepositDebugEnv = (): string | undefined =>
  process.env.MM_MONEY_VBA_DEBUG_PANEL;
