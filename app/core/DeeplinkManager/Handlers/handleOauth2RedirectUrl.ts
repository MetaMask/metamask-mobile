import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { handleCodeFlow } from '../../Oauth2Login/utils';
import DeeplinkManager from '../DeeplinkManager';


function handleOauth2RedirectUrl({
  deeplinkManager,
  url,
  base,
}: {
  deeplinkManager: DeeplinkManager;
  url: string;
  base: string;
}) {
  const minusBase = url.replace(base, '');
  const params = new URLSearchParams(minusBase);

  const state = params.get('state');
  const code = params.get('code');
  const idToken = params.get('idToken');
  const accessToken = params.get('accessToken');

  const provider = JSON.parse(state || '{}').provider;

  DevLogger.log('handleOauth2RedirectUrl: provider', provider);
  DevLogger.log('handleOauth2RedirectUrl: code', code);

  if (!provider) {
    DevLogger.log('handleOauth2RedirectUrl: no provider');
    return;
  }

  if (code || idToken || accessToken ) {
    handleCodeFlow({ code, idToken, accessToken, provider: provider as 'apple' | 'google'}, deeplinkManager.dispatch).catch((error) => {
      DevLogger.log('handleOauth2RedirectUrl: error', error);
    });
    return code;
  }

  DevLogger.log('handleOauth2RedirectUrl: no code, idToken, or accessToken');
  // on failure ?

//   deeplinkManager.dispatch(
//     showAlert({
//       isVisible: true,
//       autodismiss: 5000,
//       content: 'clipboard-alert',
//       data: { msg: strings('social login failed')},
//     }),
//   );

}

export default handleOauth2RedirectUrl;
