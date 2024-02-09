/**
 * An array of endpoint patterns to be blacklisted.
 * @type {string[]}
 */
const blacklistEndPoints = [
  '.*infura.io/*',
  '.*cdn.branch.io/*',
  '.*api2.branch.io/*',
  '.*api.etherscan.io/*',
  '.*static.metafi.codefi.network/*',
  '.*rpc.tenderly.co/*',
];

/**
 * A string representation of the blacklisted endpoint patterns,
 * formatted for use in a regular expression.
 * @type {string}
 */
const blacklistURLs = `\\("${blacklistEndPoints.join('","')}"\\)`;

/**
 * Export the blacklistURLs string.
 */
export default blacklistURLs;
