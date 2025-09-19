import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { multichainAccountServiceInit } from './multichain-account-service-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { BitcoinAccountProvider } from './providers/BitcoinAccountProvider';

jest.mock('@metamask/multichain-account-service');
jest.mock('./providers/BitcoinAccountProvider');

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

    expect(multichainAccountServiceClassMock).toHaveBeenCalledTimes(1);
    const callArgs = multichainAccountServiceClassMock.mock.calls[0][0];

    expect(callArgs.messenger).toBe(initRequestMock.controllerMessenger);
    expect(callArgs.providers).toHaveLength(1);
    expect(BitcoinAccountProvider).toHaveBeenCalledWith(
      initRequestMock.controllerMessenger,
    );
  });
});
