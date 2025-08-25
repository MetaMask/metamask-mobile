import {
  UserStorageControllerMessenger,
  UserStorageControllerState,
  Controller as UserStorageController,
} from '@metamask/profile-sync-controller/user-storage';
import type { TraceCallback } from '@metamask/controller-utils';

export const createUserStorageController = (props: {
  messenger: UserStorageControllerMessenger;
  initialState?: UserStorageControllerState;
  nativeScryptCrypto: ConstructorParameters<
    typeof UserStorageController
  >['0']['nativeScryptCrypto'];
  config?: ConstructorParameters<typeof UserStorageController>['0']['config'];
  trace?: TraceCallback;
}): UserStorageController => {
  const userStorageController = new UserStorageController({
    messenger: props.messenger,
    state: props.initialState,
    nativeScryptCrypto: props.nativeScryptCrypto,
    config: props.config,
    ...(props.trace && { trace: props.trace }),
  } as ConstructorParameters<typeof UserStorageController>[0]);
  return userStorageController;
};
