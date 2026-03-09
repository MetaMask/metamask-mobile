import { MPCKeyringOpts, MPCKeyring } from '@metamask/eth-mpc-keyring';
import { getMfaCloudSignerUrl, getMfaRelayerUrl } from './utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { dkls19Lib } from '@metamask/mpc-libs-react-native/src/wrapper';

export const mpcKeyringInit = () => {
  // MPC Keyring
  const cloudURL = getMfaCloudSignerUrl();
  const relayerURL = getMfaRelayerUrl();
  if (!cloudURL || !relayerURL) {
    throw new Error('MFA cloud signer or relayer URL is not set');
  }
  const opts: MPCKeyringOpts = {
    getRandomBytes: (length: number) =>
      crypto.getRandomValues(new Uint8Array(length)),
    dkls19Lib,
    cloudURL,
    relayerURL,
    webSocket: WebSocket,
    getVerifierToken: async (_verifierId: string) =>
       ''
      // const { mpcPasskeysEnabled } =
      //   await chrome.storage.local.get('mpcPasskeysEnabled');
      // if (mpcPasskeysEnabled === false) {
      //   return '';
      // }
      // return PasskeyOffscreenBridge.sign(verifierId);
    ,
  };
  return Object.assign(() => new MPCKeyring(opts), { type: KeyringTypes.mpc });
};
