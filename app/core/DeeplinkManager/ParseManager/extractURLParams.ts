import qs from 'qs';
import { Alert } from 'react-native';
import UrlParser from 'url-parse';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';

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
  hr: boolean; // Hide Return to App
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
    hr: false,
  };

  if (urlObj.query.length) {
    try {
      // Use arrayLimit: 1 to prevent arrays from being returned for duplicate parameters
      const parsedParams = qs.parse(urlObj.query.substring(1), {
        arrayLimit: 99,
      });
      params = {
        ...params,
        ...parsedParams,
        hr: parsedParams.hr === '1',
      };

      if (params.message) {
        params.message = params.message?.replace(/ /g, '+');
      }
    } catch (e) {
      if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
    }
  }

  return { urlObj, params };
}

export default extractURLParams;
