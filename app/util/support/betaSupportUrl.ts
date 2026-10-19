export const getBetaSupportUrl = (): string => {
  let betaSupportUrl = '';

  ///: BEGIN:ONLY_INCLUDE_IF(beta)
  betaSupportUrl = 'https://intercom.help/internal-beta-testing/en/';
  ///: END:ONLY_INCLUDE_IF

  return betaSupportUrl;
};
