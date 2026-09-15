/**
 * Resolves the "Contact support" URL used for beta builds only, which points at
 * the internal beta-testing Intercom space rather than the public help center.
 *
 * Lives in its own dependency-free module (rather than inlined at each call
 * site) for two reasons. First, `///: ONLY_INCLUDE_IF(beta)` code fences are
 * stripped by the Metro bundler at build time but are inert under Jest, so
 * without this seam the beta branch always wins in tests and the non-beta
 * consent-flow branch is unreachable; call sites mock this module to exercise
 * both directions. Second, it is imported by broadly-used modules (e.g. the
 * rewards utils), so it must not drag `Engine` or other heavy dependencies into
 * their test graphs the way importing it from `app/util/support` would.
 */
export const getBetaSupportUrl = (): string => {
  let betaSupportUrl = '';

  ///: BEGIN:ONLY_INCLUDE_IF(beta)
  betaSupportUrl = 'https://intercom.help/internal-beta-testing/en/';
  ///: END:ONLY_INCLUDE_IF

  return betaSupportUrl;
};
