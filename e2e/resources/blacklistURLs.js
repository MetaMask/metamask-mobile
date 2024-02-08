const blacklistURLs = [
  '.*infura.io/*',
  '.*cdn.branch.io/*',
  '.*api2.branch.io/*', //this url is not consistently being blocked
  '.*api.etherscan.io/*',
  '.*static.metafi.codefi.network/*',
];

export default blacklistURLs;
