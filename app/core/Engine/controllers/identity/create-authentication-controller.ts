import {
  AuthenticationControllerMessenger,
  AuthenticationControllerState,
  Controller as AuthenticationController,
} from '@metamask/profile-sync-controller/auth';

export const createAuthenticationController = (props: {
  messenger: AuthenticationControllerMessenger;
  initialState?: AuthenticationControllerState;
  metametrics: ConstructorParameters<
    typeof AuthenticationController
  >['0']['metametrics'];
}): AuthenticationController => {
  const authenticationController = new AuthenticationController({
    messenger: props.messenger,
    state: props.initialState,
    metametrics: props.metametrics,
  });
  return authenticationController;
};
