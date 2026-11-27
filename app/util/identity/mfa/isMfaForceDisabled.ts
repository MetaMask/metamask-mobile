/**
 * Whether the build force-disables every MFA surface.
 *
 * This is the one MFA switch that takes precedence over the remote flags. The
 * per-surface locals (`MM_MONEY_MFA_ENABLED`, `MM_CARD_IMMERSVE_MFA_ENABLED`)
 * are fallbacks that only apply when the remote flag is missing or invalid, so
 * they can turn a surface on but never off. Without this, a build has no way
 * to guarantee MFA stays off while the remote flags are enabled.
 *
 * @param flag - The build's `MM_MFA_DISABLED`, inlined at build time.
 * @returns `true` when MFA is force-disabled for this build.
 */
export const isMfaForceDisabled = (
  flag = process.env.MM_MFA_DISABLED,
): boolean => flag === 'true';
