/**
 * Holds the runtime fox_code from native (Info.plist / MM_FOX_CODE) so About can
 * show a fingerprint for CI/build verification. Never expose the full value in UI.
 */
let runtimeFoxCode: string | null = null;

function fingerprintFoxCodeString(s: string | undefined | null): string {
  if (s === undefined || s === null || s === '') {
    return '—';
  }
  const n = s.length;
  if (n < 6) {
    return `(${n} chars; need 6+ for 3+3)`;
  }
  return `${s.slice(0, 3)}…${s.slice(-3)}`;
}

/**
 * Called from Root when the app starts; must match the value passed to SecureKeychain.init.
 */
export function setRuntimeFoxCode(foxCode: string): void {
  runtimeFoxCode = foxCode;
}

/**
 * Native `foxCode` (initialProps) — first 3 and last 3 characters, or a safe placeholder.
 */
export function getFoxCodeFingerprint(): string {
  return fingerprintFoxCodeString(runtimeFoxCode);
}

/**
 * `process.env.MM_FOX_CODE` as inlined at JS bundle build time (Babel). Compare to
 * {@link getFoxCodeFingerprint} to detect native vs Metro env mismatch.
 */
export function getJsBundleMmFoxCodeFingerprint(): string {
  const raw =
    typeof process !== 'undefined' ? process.env.MM_FOX_CODE : undefined;
  return fingerprintFoxCodeString(raw);
}
