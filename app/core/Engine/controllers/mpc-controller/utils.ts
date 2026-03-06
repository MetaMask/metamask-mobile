export const getMfaCloudSignerUrl = () =>
  // return 'http://localhost:3000';
   'https://mpc-service.dev-api.cx.metamask.io/v1/mpc'
  // return process.env.MFA_CLOUD_SIGNER_URL;
;
export const getMfaRelayerUrl = () =>
   'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket'
  // return process.env.MFA_RELAYER_URL;
;

export default {
  getMfaCloudSignerUrl,
  getMfaRelayerUrl,
};
