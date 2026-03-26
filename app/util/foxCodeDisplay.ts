/**
 * Holds the runtime fox_code from native (Info.plist / MM_FOX_CODE) so About can
 * show a fingerprint for CI/build verification. Never expose the full value in UI.
 */
let runtimeFoxCode: string | null = null;

/**
 * Called from Root when the app starts; must match the value passed to SecureKeychain.init.
 */
export function setRuntimeFoxCode(foxCode: string): void {
  runtimeFoxCode = foxCode;
}

/**
 * Returns first 3 and last 3 characters, or a safe placeholder.
 */
export function getFoxCodeFingerprint(): string {
  if (runtimeFoxCode === null || runtimeFoxCode === '') {
    return '—';
  }
  const s = runtimeFoxCode;
  const n = s.length;
  if (n < 6) {
    return `(${n} chars; need 6+ for 3+3)`;
  }
  return `${s.slice(0, 3)}…${s.slice(-3)}`;
}
