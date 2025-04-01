import DeeplinkManager from '../DeeplinkManager';
import Oauth2LoginService from '../../Oauth2Login/Oauth2loginService';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';

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

  const state = JSON.parse(params.get('state') ?? '{}');
  const code = params.get('code') ?? undefined;

  const provider = state.provider as 'apple' | 'google';
  const clientId = state.clientId as string;

  Logger.log('handleOauth2RedirectUrl: provider', provider);
  Logger.log('handleOauth2RedirectUrl: code', code);

  Logger.log('handleOauth2RedirectUrl: state', state);
  if (code ) {
    Oauth2LoginService.handleCodeFlow({ code, provider , clientId, redirectUri: state.redirectUri, codeVerifier: Oauth2LoginService.localState.codeVerifier ?? undefined })
    .then((result) => {
      Logger.log('handleOauth2RedirectUrl: result', result);
      if (result.type === 'success') {
        // get current route
        // const currentRoute = deeplinkManager.navigation.getCurrentRoute();
        deeplinkManager.navigation.navigate('ChoosePassword');
        return code;
      }
    }).catch((error) => {
      Logger.log('handleOauth2RedirectUrl: error', error);
    });
  } else {
    deeplinkManager.dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('oauth2-login-failed')},
      }),
    );
  }

}

export default handleOauth2RedirectUrl;
