const blacklistEndPoints = [
  '.*infura.io/*',
  '.*cdn.branch.io/*',
  '.*api2.branch.io/*',
  '.*api.etherscan.io/*',
  '.*static.metafi.codefi.network/*',
  '.*rpc.tenderly.co/*',
];

const blacklistURLs = `\\("${blacklistEndPoints.join('","')}"\\)`;

export default blacklistURLs;
