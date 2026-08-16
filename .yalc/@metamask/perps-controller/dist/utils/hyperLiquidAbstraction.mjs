const MIGRATABLE_ABSTRACTION_MODES = new Set([
    'dexAbstraction',
    'default',
    'disabled',
]);
/**
 * Determine whether unified-account setup should be deferred until a user
 * explicitly starts a trading or withdrawal action.
 *
 * @param currentMode - The user's current HyperLiquid abstraction mode.
 * @param allowUserSigning - Whether the caller is allowed to trigger wallet signing.
 * @returns True when migration would require a signing-backed mutation that should be deferred.
 */
export function shouldDeferUnifiedAccountSetup(currentMode, allowUserSigning) {
    return (!allowUserSigning &&
        currentMode !== undefined &&
        MIGRATABLE_ABSTRACTION_MODES.has(currentMode));
}
//# sourceMappingURL=hyperLiquidAbstraction.mjs.map