import qs from 'qs';
import { Alert } from 'react-native';
import UrlParser from 'url-parse';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Logger from '../../../util/Logger';
import DevLogger from '../../SDKConnect/utils/DevLogger';

export interface DeeplinkUrlParams {
  uri: string;
  redirect: string;
  channelId: string;
  comm: string;
  pubkey: string;
  scheme?: string;
  v?: string;
  rpc?: string;
  sdkVersion?: string;
  message?: string;
  originatorInfo?: string;
  request?: string;
  account?: string; // This is the format => "address@chainId"
}

function extractURLParams(url: string) {
  const urlObj = new UrlParser(
    url
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTPS}://`, `${PROTOCOLS.DAPP}/`)
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTP}://`, `${PROTOCOLS.DAPP}/`),
  );

  let params: DeeplinkUrlParams = {
    pubkey: '',
    uri: '',
    redirect: '',
    v: '',
    sdkVersion: '',
    rpc: '',
    originatorInfo: '',
    channelId: '',
    comm: '',
  };

  DevLogger.log(`extractParams:: urlObj`, urlObj);

  if (urlObj.query.length) {
    try {
      params = qs.parse(
        urlObj.query.substring(1),
      ) as unknown as DeeplinkUrlParams;

      if (params.message) {
        Logger.log('extractParams:: message before...: ', params.message);
        params.message = params.message?.replace(/ /g, '+');
        Logger.log('extractParams:: message after: ', params.message);
      }
    } catch (e) {
      if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
    }
  }

  return { urlObj, params };
}

export default extractURLParams;
