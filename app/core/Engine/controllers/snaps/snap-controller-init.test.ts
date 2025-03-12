import { SnapController } from '@metamask/snaps-controllers';
import { Messenger } from '@metamask/base-controller';
import { ControllerInitRequest } from '../../types';
import {
  getSnapControllerInitMessenger,
  getSnapControllerMessenger,
  SnapControllerInitMessenger,
  SnapControllerMessenger,
} from '../../messengers/snaps';
import { snapControllerInit } from './snap-controller-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/snaps-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SnapControllerMessenger, SnapControllerInitMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSnapControllerMessenger(baseMessenger),
    initMessenger: getSnapControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('SnapControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = snapControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SnapController);
  });

  it('passes the proper arguments to the controller', () => {
    snapControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SnapController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      clientCryptography: {
        pbkdf2Sha512: expect.any(Function),
      },
      detectSnapLocation: expect.any(Function),
      encryptor: expect.any(Object),
      environmentEndowmentPermissions: expect.any(Array),
      excludedPermissions: expect.any(Object),
      featureFlags: {
        allowLocalSnaps: false,
        disableSnapInstallation: false,
        requireAllowlist: false,
      },
      getFeatureFlags: expect.any(Function),
      getMnemonic: expect.any(Function),
      preinstalledSnaps: expect.any(Array),
    });
  });
});
