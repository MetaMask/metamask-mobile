import qs from 'qs';
import { Alert } from 'react-native';
import UrlParser from 'url-parse';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';

function extractURLParams(url: string) {
  const urlObj = new UrlParser(
    url
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTPS}://`, `${PROTOCOLS.DAPP}/`)
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTP}://`, `${PROTOCOLS.DAPP}/`),
  );

  let params: {
    uri: string;
    redirect: string;
    channelId: string;
    comm: string;
    pubkey: string;
  } = {
    pubkey: '',
    uri: '',
    redirect: '',
    channelId: '',
    comm: '',
  };

  if (urlObj.query.length) {
    try {
      params = qs.parse(urlObj.query.substring(1)) as {
        uri: string;
        redirect: string;
        channelId: string;
        comm: string;
        pubkey: string;
      };
    } catch (e) {
      if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
    }
  }

  return { urlObj, params };
}

export default extractURLParams;
