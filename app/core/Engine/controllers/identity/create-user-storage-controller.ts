import {
  UserStorageControllerMessenger,
  UserStorageControllerState,
  Controller as UserStorageController,
} from '@metamask/profile-sync-controller/user-storage';

export const createUserStorageController = (props: {
  messenger: UserStorageControllerMessenger;
  initialState?: UserStorageControllerState;
  nativeScryptCrypto: ConstructorParameters<
    typeof UserStorageController
  >['0']['nativeScryptCrypto'];
  config?: ConstructorParameters<typeof UserStorageController>['0']['config'];
  env?: ConstructorParameters<typeof UserStorageController>['0']['env'];
}): UserStorageController => {
  const userStorageController = new UserStorageController({
    messenger: props.messenger,
    state: props.initialState,
    nativeScryptCrypto: props.nativeScryptCrypto,
    config: props.config,
    env: props.env,
  });
  return userStorageController;
};
