import { RelayerTypes } from '@walletconnect/types';
import { parseRelayParams } from '@walletconnect/utils';
import qs from 'qs';

export interface WCMultiVersionParams {
  protocol: string;
  version: number;
  topic: string;
  // v2 params
  symKey?: string;
  relay?: RelayerTypes.ProtocolOptions;
  // v1 params
  bridge?: string;
  key?: string;
  handshakeTopic?: string;
}

const parseWalletConnectUri = (str: string): WCMultiVersionParams => {
  const pathStart: number = str.indexOf(':');
  const pathEnd: number | undefined =
    str.indexOf('?') !== -1 ? str.indexOf('?') : undefined;
  const protocol = str.substring(0, pathStart);
  const path: string = str.substring(pathStart + 1, pathEnd);
  const requiredValues = path.split('@');

  const queryString: string =
    typeof pathEnd !== 'undefined' ? str.substring(pathEnd) : '';
  const queryParams = qs.parse(queryString);
  const result = {
    protocol,
    topic: requiredValues[0],
    version: parseInt(requiredValues[1], 10),
    symKey: queryParams.symKey as string,
    relay: parseRelayParams(queryParams),
    bridge: queryParams.bridge as string,
    key: queryParams.key as string,
    handshakeTopic: queryParams.handshakeTopic as string,
  };

  return result;
};

export default parseWalletConnectUri;
