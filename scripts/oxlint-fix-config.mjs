/**
 * Config transform for scripts/oxlint-fix.mjs. Kept free of process and
 * import.meta so Jest can load it.
 */

/**
 * @typedef {Record<string, unknown>} RuleMap
 * @typedef {{ files?: string[], excludeFiles?: string[], rules?: RuleMap } & Record<string, unknown>} OxlintOverride
 * @typedef {{ options?: Record<string, unknown>, rules?: RuleMap, overrides?: OxlintOverride[] } & Record<string, unknown>} OxlintConfig
 * @typedef {OxlintConfig & { options: Record<string, unknown>, rules: RuleMap, overrides: (OxlintOverride & { rules: RuleMap })[] }} FixConfig
 */

/**
 * Suppression entries and config keys can name a rule with different plugin
 * prefixes (react-hooks/rules-of-hooks vs react/rules-of-hooks), so match on
 * the rule name alone.
 * @param {string} rule
 */
const bareRuleName = (rule) => rule.slice(rule.lastIndexOf('/') + 1);

/**
 * @param {unknown} value Rule setting: severity, or [severity, ...options].
 */
function asWarning(value) {
  const [severity, ...options] = Array.isArray(value) ? value : [value];
  if (severity === 'off' || severity === 0 || severity === 'allow') {
    return value;
  }
  return options.length ? ['warn', ...options] : 'warn';
}

/**
 * Copy of .oxlintrc.json for the fix pass: rules with bulk suppressions are
 * off, every other rule warns, and type-aware rules are off.
 * @param {OxlintConfig} config Parsed .oxlintrc.json.
 * @param {Record<string, Record<string, unknown>>} suppressions Parsed oxlint-suppressions.json.
 * @returns {FixConfig}
 */
export function buildFixConfig(config, suppressions) {
  const suppressed = new Set();
  for (const rules of Object.values(suppressions)) {
    for (const rule of Object.keys(rules)) {
      suppressed.add(bareRuleName(rule));
    }
  }
  /** @param {RuleMap} [rules] */
  const adjust = (rules = {}) =>
    Object.fromEntries(
      Object.entries(rules).map(([rule, value]) => [
        rule,
        suppressed.has(bareRuleName(rule)) ? 'off' : asWarning(value),
      ]),
    );
  const next = structuredClone(config);
  delete next.$schema;
  next.options = { ...next.options, typeAware: false };
  next.rules = adjust(next.rules);
  next.overrides = (next.overrides ?? []).map((override) => ({
    ...override,
    rules: adjust(override.rules),
  }));
  return next;
}
