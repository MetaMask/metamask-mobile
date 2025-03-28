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

  const state = JSON.parse(params.get('state') ?? '{}');
  const code = params.get('code') ?? undefined;

  const provider = state.provider as 'apple' | 'google';
  const clientId = state.clientId as string;

  DevLogger.log('handleOauth2RedirectUrl: provider', provider);
  DevLogger.log('handleOauth2RedirectUrl: code', code);

  console.log('handleOauth2RedirectUrl: state', state);
  if (code ) {
    handleCodeFlow({ code, provider , clientId, redirectUri: state.redirectUri})
    .then((result) => {
      if (result.status === 'success') {
        // get current route
        // const currentRoute = deeplinkManager.navigation.getCurrentRoute();
        deeplinkManager.navigation.navigate('ChoosePassword');
        return code;
      }
    }).catch((error) => {
      DevLogger.log('handleOauth2RedirectUrl: error', error);
    });
  } else {
  //   deeplinkManager.dispatch(
  //     showAlert({
  //       isVisible: true,
  //       autodismiss: 5000,
  //       content: 'clipboard-alert',
  //       data: { msg: strings('social login failed')},
  //     }),
  //   );
  }

}

export default handleOauth2RedirectUrl;
