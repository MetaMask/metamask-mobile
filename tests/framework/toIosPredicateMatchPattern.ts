/**
 * NSPredicate `MATCHES` requires the entire string to match the regex.
 * Prefix patterns (`^foo-`) need a trailing wildcard; unanchored patterns are
 * wrapped like Android's `.*…*` so Detox-style partial RegExp IDs still work.
 * Exact end anchors (`…$`) are left unchanged.
 */
export function toIosPredicateMatchPattern(escapedRegexSource: string): string {
  if (escapedRegexSource.endsWith('$')) {
    return escapedRegexSource;
  }
  if (/(?:\.\*|\.\+)$/.test(escapedRegexSource)) {
    return escapedRegexSource;
  }
  if (escapedRegexSource.startsWith('^')) {
    return `${escapedRegexSource}.*`;
  }
  return `.*${escapedRegexSource}.*`;
}
