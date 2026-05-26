/**
 * Paths that affect app-wide state or boot wiring. Changes here require running all E2E tags.
 */
const GLOBAL_INFRASTRUCTURE_PATH_PREFIXES = [
  'app/components/hooks/',
  'app/contexts/',
  'app/store/',
] as const;

/** Engine entry/wiring (not the full controllers tree under app/core/Engine/). */
const GLOBAL_INFRASTRUCTURE_EXACT_FILES = [
  'app/core/Engine/Engine.ts',
  'app/core/Engine/index.ts',
] as const;

function normalizeChangedFilePath(file: string): string {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

function matchesGlobalInfrastructurePath(file: string): boolean {
  if (
    GLOBAL_INFRASTRUCTURE_EXACT_FILES.includes(
      file as (typeof GLOBAL_INFRASTRUCTURE_EXACT_FILES)[number],
    )
  ) {
    return true;
  }

  return GLOBAL_INFRASTRUCTURE_PATH_PREFIXES.some((prefix) =>
    file.startsWith(prefix),
  );
}

/**
 * Returns a hard-rule reason when any changed file touches global infrastructure.
 */
export function getGlobalInfrastructureHardRuleReason(
  changedFiles: string[],
): string | null {
  const matchingFiles = changedFiles
    .map(normalizeChangedFilePath)
    .filter(matchesGlobalInfrastructurePath);

  if (matchingFiles.length === 0) {
    return null;
  }

  return `Global infrastructure changed: ${matchingFiles.join(', ')}`;
}
