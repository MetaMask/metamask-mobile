// The `///: ONLY_INCLUDE_IF` fence below is stripped by Metro's build-time
// preprocessor, but babel-jest (used under Jest) leaves it as a plain
// comment. Keeping the fence inline in a component body would make
// `betaSupportUrl` always truthy under test, permanently hiding the non-beta
// branch. Isolating it here lets tests mock this module instead.
export const getBetaSupportUrl = (): string => {
  let betaSupportUrl = '';
  ///: BEGIN:ONLY_INCLUDE_IF(beta)
  betaSupportUrl = 'https://intercom.help/internal-beta-testing/en/';
  ///: END:ONLY_INCLUDE_IF
  return betaSupportUrl;
};
