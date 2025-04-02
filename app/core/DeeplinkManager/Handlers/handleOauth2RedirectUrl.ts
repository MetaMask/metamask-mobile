import DeeplinkManager from '../DeeplinkManager';
import Oauth2LoginService, { LoginMode, LoginProvider } from '../../Oauth2Login/Oauth2loginService';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import { UserActionType } from '../../../actions/user';

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
  const mode = state.mode as LoginMode;
  const provider = state.provider as LoginProvider;

  const clientId = state.clientId as string;

  Logger.log('handleOauth2RedirectUrl: provider', provider);
  Logger.log('handleOauth2RedirectUrl: code', code);

  Logger.log('handleOauth2RedirectUrl: state', state);
  if (code ) {
    Oauth2LoginService.handleCodeFlow({ code, provider , clientId, redirectUri: state.redirectUri, codeVerifier: Oauth2LoginService.localState.codeVerifier ?? undefined })
    .then((result) => {
      Logger.log('handleOauth2RedirectUrl: result', result);

      Logger.log('handleOauth2RedirectUrl: result.existingUser', result.existingUser);
      if (result.type === 'success') {
        // deeplinkManager.dispatch({type: UserActionType.OAUTH2_LOGIN_SUCCESS});

        Logger.log('handleOauth2RedirectUrl: mode', mode);
        Logger.log('handleOauth2RedirectUrl: result.existingUser', result.existingUser);
        if (mode === 'onboarding') {
          if (result.existingUser) {
            deeplinkManager.navigation.navigate('Login');
          } else {
            deeplinkManager.navigation.navigate('ChoosePassword');
          }
        } else if (mode === 'change-password') {
          deeplinkManager.navigation.navigate('ChangePassword');
        }
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
