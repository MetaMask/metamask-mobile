// Maps constant names to resolved flag strings for bracket-access like
// `remoteFeatureFlags[CONSTANT]`. Add new constants here when the CI job
// reports an "unresolved constant" error.
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const REWARDS_FILE = 'app/selectors/featureFlagController/rewards/rewardsEnabled.ts';
const sel = (sub: string) => `app/selectors/featureFlagController/${sub}/index.ts`;

const FILE_SOURCES: Array<{ key: string; file: string; exportName: string }> = [
  { key: 'BITCOIN_REWARDS_FLAG_NAME', file: REWARDS_FILE, exportName: 'BITCOIN_REWARDS_FLAG_NAME' },
  { key: 'TRON_REWARDS_FLAG_NAME', file: REWARDS_FILE, exportName: 'TRON_REWARDS_FLAG_NAME' },
  { key: 'SNAPSHOTS_REWARDS_FLAG_NAME', file: REWARDS_FILE, exportName: 'SNAPSHOTS_REWARDS_FLAG_NAME' },
  { key: 'MISSING_ENROLLED_ACCOUNTS_FLAG_NAME', file: REWARDS_FILE, exportName: 'MISSING_ENROLLED_ACCOUNTS_FLAG_NAME' },
  { key: 'CAMPAIGNS_REWARDS_FLAG_NAME', file: REWARDS_FILE, exportName: 'CAMPAIGNS_REWARDS_FLAG_NAME' },
  { key: 'ACCOUNT_MENU_FLAG_KEY', file: sel('accountMenu'), exportName: 'ACCOUNT_MENU_FLAG_KEY' },
  { key: 'NETWORK_MANAGEMENT_FLAG_KEY', file: sel('networkManagement'), exportName: 'NETWORK_MANAGEMENT_FLAG_KEY' },
  // FEATURE_FLAG_NAME is omitted (non-unique across rwa / gasFeesSponsored); per-file fallback handles it.
  { key: 'OTA_UPDATES_FLAG_NAME', file: sel('otaUpdates'), exportName: 'OTA_UPDATES_FLAG_NAME' },
  { key: 'FULL_PAGE_ACCOUNT_LIST_FLAG_NAME', file: sel('fullPageAccountList'), exportName: 'FULL_PAGE_ACCOUNT_LIST_FLAG_NAME' },
  { key: 'IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME', file: sel('importSrpWordSuggestion'), exportName: 'IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME' },
  { key: 'ASSETS_UNIFY_STATE_FLAG', file: sel('assetsUnifyState'), exportName: 'ASSETS_UNIFY_STATE_FLAG' },
];

function resolveConstantFromFile(filePath: string, constantName: string): string | undefined {
  try {
    const content = fs.readFileSync(path.resolve(REPO_ROOT, filePath), 'utf-8');
    const escaped = constantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(?:export\\s+)?const\\s+${escaped}(?:\\s*:[^=]+)?\\s*=\\s*(?:'([^']+)'|"([^"]+)"|` + '`([^`]+)`)',
    );
    const match = re.exec(content);
    return match?.[1] ?? match?.[2] ?? match?.[3];
  } catch { return undefined; }
}

function resolveFeatureFlagNamesEnum(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const content = fs.readFileSync(path.resolve(REPO_ROOT, 'app/constants/featureFlags.ts'), 'utf-8');
    const enumMatch = content.match(/enum\s+FeatureFlagNames\s*\{([^}]+)\}/);
    if (!enumMatch) return result;
    const entryRe = /(\w+)\s*=\s*(?:'([^']+)'|"([^"]+)"|`([^`]+)`)/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(enumMatch[1])) !== null) {
      const value = m[2] ?? m[3] ?? m[4];
      if (m[1] && value) result[`FeatureFlagNames.${m[1]}`] = value;
    }
  } catch { /* non-fatal */ }
  return result;
}

export function resolveConstantFromSourceFile(constantName: string, sourceFilePath: string): string | undefined {
  return resolveConstantFromFile(sourceFilePath, constantName);
}

export function buildKnownFlagConstants(): Record<string, string> {
  const constants: Record<string, string> = { ...resolveFeatureFlagNamesEnum() };
  for (const { key, file, exportName } of FILE_SOURCES) {
    const resolved = resolveConstantFromFile(file, exportName);
    if (resolved) constants[key] = resolved;
  }
  return constants;
}
