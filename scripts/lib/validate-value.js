/**
 * Shared hygiene checks for CI-injected values (GitHub secrets and builds.yml env values).
 *
 * The goal is to catch operator mistakes (trailing newline, Windows line endings,
 * invisible characters pasted from rich text editors, etc.) at build time, before
 * malformed values end up baked into a production binary.
 *
 * Intentionally format-agnostic: it does not try to understand whether a value
 * is a URL, base64 blob, JWT, etc. It only enforces generic hygiene.
 *
 * Usage:
 *   const { checkValue } = require('./lib/validate-value');
 *   const issues = checkValue('MM_SENTRY_DSN', value);
 *   // issues is an array; empty => value is clean.
 *
 * Output contract: issue messages MUST NOT include the value itself or any
 * substring of it. Only the length, offsets, and character code points are
 * safe to surface.
 */

/* global Buffer */

// eslint-disable-next-line no-misleading-character-class -- intentional set of invisible code points (ZWSP/ZWNJ/ZWJ/BOM)
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/;

// C0/C1 control chars, excluding tab (\u0009), line feed (\u000A), and
// carriage return (\u000D). CR is reported separately with a friendlier
// message. LF is allowed mid-value for multi-line secrets (PEM keys, base64).
/* eslint-disable no-control-regex -- intentionally matches control characters to flag them */
const CONTROL_CHARS =
  /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
/* eslint-enable no-control-regex */

function formatCodePoint(ch) {
  return `U+${ch.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`;
}

/**
 * @param {string} name - Identifier to report in violations (e.g. secret name or env key).
 * @param {unknown} value - The value to check. Non-string values are coerced via String().
 * @param {object} [options]
 * @param {boolean} [options.allowEmpty=false] - If true, an empty string is not a violation.
 *   Whitespace-only strings still fail even when allowEmpty is true (they indicate a typo).
 * @returns {{ code: string, message: string }[]} - One entry per distinct violation; empty array means clean.
 */
function checkValue(name, value, options = {}) {
  const { allowEmpty = false } = options;
  const violations = [];

  /**
   * `missing`: the value is `undefined` or `null`. For secrets, this means the
   * referenced GitHub Environment secret was never set (or the Environment
   * itself is misconfigured). For YAML env entries, it usually means a key
   * like `FOO:` was written with no value, which js-yaml parses as `null`.
   * Short-circuits: nothing else can be checked without a value.
   */
  if (value === undefined || value === null) {
    violations.push({
      code: 'missing',
      message: `${name}: value is null or not defined`,
    });
    return violations;
  }

  const str = String(value);
  const len = Buffer.byteLength(str, 'utf8');

  /**
   * `empty`: the value is the empty string `""`. Skipped when the caller
   * passes `{ allowEmpty: true }`, used for intentionally-empty YAML entries
   * such as optional allowlists (e.g. `MM_PERPS_HIP3_ALLOWLIST_MARKETS: ''`).
   * Short-circuits: the remaining checks don't apply to an empty string.
   */
  if (str === '') {
    if (!allowEmpty) {
      violations.push({
        code: 'empty',
        message: `${name}: value is an empty string`,
      });
    }
    return violations;
  }

  /**
   * `whitespace_only`: the value is non-empty but contains nothing except
   * whitespace. Almost always a typo (e.g. someone pasted a single space
   * into the GitHub Secret UI). Fails even with `allowEmpty: true`, because
   * "intentionally empty" should be `""`, not `"   "`.
   * Short-circuits: the value has no meaningful content to inspect further.
   */
  if (str.trim() === '') {
    violations.push({
      code: 'whitespace_only',
      message: `${name}: value is whitespace-only (${len} bytes)`,
    });
    return violations;
  }

  /**
   * `leading_whitespace`: the value begins with whitespace (space, tab, LF,
   * etc.). Accidental leading whitespace breaks URL parsing, base64 decoding,
   * and token comparisons — almost never intentional.
   */
  if (/^\s/.test(str)) {
    violations.push({
      code: 'leading_whitespace',
      message: `${name}: value has leading whitespace (${len} bytes total)`,
    });
  }

  /**
   * `trailing_whitespace`: the value ends with whitespace. This is the
   * single most common real-world paste mistake — e.g. copying a token from
   * a terminal or editor ends up including the trailing `\n`. It's the
   * specific failure mode this entire module was built to catch.
   */
  if (/\s$/.test(str)) {
    violations.push({
      code: 'trailing_whitespace',
      message: `${name}: value has trailing whitespace (${len} bytes total); a trailing newline pasted from a terminal or editor is the most common cause`,
    });
  }

  /**
   * `carriage_return`: the value contains `\r` anywhere. CR is not part of
   * the base64 alphabet, PEM uses LF, and no sanctioned secret format needs
   * it — its presence is essentially always an artifact of Windows CRLF line
   * endings surviving a copy-paste. Reported separately from `control_chars`
   * so the remediation message can specifically call out Windows endings.
   */
  const crIndex = str.indexOf('\r');
  if (crIndex !== -1) {
    violations.push({
      code: 'carriage_return',
      message: `${name}: value contains a carriage return (\\r) at offset ${crIndex}/${len}; strip Windows line endings before saving the secret`,
    });
  }

  /**
   * `nul_byte`: the value contains `\u0000`. Never legitimate in any secret
   * format we use. A NUL byte can terminate strings prematurely in C-based
   * tooling and is a classic source of silent truncation bugs.
   */
  const nulIndex = str.indexOf('\u0000');
  if (nulIndex !== -1) {
    violations.push({
      code: 'nul_byte',
      message: `${name}: value contains a NUL byte at offset ${nulIndex}/${len}`,
    });
  }

  /**
   * `control_chars`: the value contains any other C0/C1 control character
   * (range defined in CONTROL_CHARS — excludes tab, LF, and CR, which are
   * allowed or reported separately). Hits here usually indicate non-text
   * binary data was pasted as if it were a string, or a stray escape
   * sequence. The message includes the specific code point (e.g. U+0007)
   * so operators can identify what was pasted.
   */
  const ctrlMatch = CONTROL_CHARS.exec(str);
  if (ctrlMatch) {
    violations.push({
      code: 'control_chars',
      message: `${name}: value contains control character ${formatCodePoint(ctrlMatch[0])} at offset ${ctrlMatch.index}/${len}`,
    });
  }

  /**
   * `zero_width`: the value contains an invisible Unicode character —
   * zero-width space (U+200B), zero-width non-joiner (U+200C), zero-width
   * joiner (U+200D), or byte-order mark (U+FEFF). These are introduced when
   * copying from rich-text sources (Google Docs, Slack, Notion, Confluence)
   * and are invisible to the human eye but break exact-match comparisons
   * and break formats like base64 that only accept a strict alphabet.
   */
  const zwMatch = ZERO_WIDTH_CHARS.exec(str);
  if (zwMatch) {
    violations.push({
      code: 'zero_width',
      message: `${name}: value contains invisible character ${formatCodePoint(zwMatch[0])} at offset ${zwMatch.index}/${len}; likely pasted from a rich text source`,
    });
  }

  return violations;
}

module.exports = { checkValue };
