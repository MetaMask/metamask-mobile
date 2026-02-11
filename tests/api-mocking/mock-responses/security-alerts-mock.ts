export const securityAlertsUrl = (chainId: string): string =>
  `https://security-alerts.api.cx.metamask.io/validate/${chainId}`;

export const SECURITY_ALERTS_BENIGN_RESPONSE = {
  block: 20733513,
  result_type: 'Benign',
  reason: '',
  description: '',
  features: [],
};

export const SECURITY_ALERTS_REQUEST_BODY = {
  jsonrpc: '2.0',
  method: 'eth_sendTransaction',
  origin: 'metamask',
  params: [
    {
      from: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
      to: '0x50587e46c5b96a3f6f9792922ec647f13e6efae4',
      value: '0x0',
    },
  ],
};
