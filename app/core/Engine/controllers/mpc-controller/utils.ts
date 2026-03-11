export const checkMfaEnabled = () =>
  // return process.env.MPC_ENABLED === 'true';
   true
;
export const getMfaCloudSignerUrl = () =>
  // return 'http://localhost:3000';
  // 'https://mpc-service.dev-api.cx.metamask.io/v1/mpc'
  // 'https://mpc-service-non-enclave.dev-api.cx.metamask.io/v1/mpc';
  'https://mfa-mpc-service.web3auth.dev/v1/mpc';
// return process.env.MFA_CLOUD_SIGNER_URL;
export const getMfaRelayerUrl = () =>
  'wss://mfa-centrifuge.web3auth.dev/connection/websocket';
// 'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket';
// return process.env.MFA_RELAYER_URL;

export default {
  getMfaCloudSignerUrl,
  getMfaRelayerUrl,
};
