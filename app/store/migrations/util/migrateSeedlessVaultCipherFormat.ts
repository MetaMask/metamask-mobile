/**
 * Rewrites SeedlessOnboardingController.vault from legacy `data`-only format to
 * include the mobile-canonical `cipher` field (ADR TO-590).
 *
 * @param vault - The serialized vault string to inspect.
 * @returns The possibly rewritten vault and whether a migration was applied.
 */
export function migrateSeedlessVaultCipherFormat(vault: unknown): {
  vault: string | undefined;
  migrated: boolean;
} {
  if (typeof vault !== 'string' || !vault.startsWith('{')) {
    return {
      vault: typeof vault === 'string' ? vault : undefined,
      migrated: false,
    };
  }

  try {
    const payload = JSON.parse(vault) as Record<string, unknown>;
    if (payload.data !== undefined && payload.cipher === undefined) {
      return {
        vault: JSON.stringify({ ...payload, cipher: payload.data }),
        migrated: true,
      };
    }
  } catch {
    // Invalid JSON — leave unchanged.
  }

  return { vault, migrated: false };
}
