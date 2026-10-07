/**
 * Reads the raw VBA demo override values. Kept in its own module because
 * Babel inlines `process.env` at transform time. Local demo only. Do not
 * commit this file on the 4073 pull request.
 *
 * @returns The env values, or undefined when unset.
 */
export const readVbaKycStatusOverrideEnv = (): string | undefined =>
  process.env.MM_MONEY_VBA_KYC_STATUS_OVERRIDE;

export const readVbaAutorampStatusOverrideEnv = (): string | undefined =>
  process.env.MM_MONEY_VBA_AUTORAMP_STATUS_OVERRIDE;

export const readVbaSetupErrorOverrideEnv = (): string | undefined =>
  process.env.MM_MONEY_VBA_SETUP_ERROR_OVERRIDE;
