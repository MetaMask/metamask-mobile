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
  message?: string;
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
    channelId: '',
    comm: '',
  };

  if (urlObj.query.length) {
    try {
      params = qs.parse(
        urlObj.query.substring(1),
      ) as unknown as DeeplinkUrlParams;
    } catch (e) {
      if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
    }
  }

  return { urlObj, params };
}

export default extractURLParams;
