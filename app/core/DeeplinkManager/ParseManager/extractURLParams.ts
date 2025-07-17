import qs from 'qs';
import { Alert } from 'react-native';
import UrlParser from 'url-parse';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Logger from '../../../util/Logger';

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
  attributionId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
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
    attributionId: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
  };

  if (urlObj.query.length) {
    try {
      const parsedParams = qs.parse(
        urlObj.query.substring(1),
      ) as Partial<DeeplinkUrlParams>;
      params = { ...params, ...parsedParams };

      if (params.message) {
        params.message = params.message?.replace(/ /g, '+');
      }

      // Ensure UTM parameters are properly set in the params object
      params.utm_source = params.utm_source || undefined;
      params.utm_medium = params.utm_medium || undefined;
      params.utm_campaign = params.utm_campaign || undefined;
      params.utm_term = params.utm_term || undefined;
      params.utm_content = params.utm_content || undefined;
    } catch (e) {
      if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
    }
  }

  return { urlObj, params };
}

export default extractURLParams;
