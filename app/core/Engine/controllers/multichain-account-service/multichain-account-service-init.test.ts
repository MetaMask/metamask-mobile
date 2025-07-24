import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { multichainAccountServiceInit } from './multichain-account-service-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/multichain-account-service');

describe('MultichainAccountServiceInit', () => {
  const multichainAccountServiceClassMock = jest.mocked(
    MultichainAccountService,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<MultichainAccountServiceMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns service instance', () => {
    expect(
      multichainAccountServiceInit(initRequestMock).controller,
    ).toBeInstanceOf(MultichainAccountService);
  });

  it('initializes with correct messenger and state', () => {
    multichainAccountServiceInit(initRequestMock);

    expect(multichainAccountServiceClassMock).toHaveBeenCalledWith({
      messenger: initRequestMock.controllerMessenger,
    });
  });
});
