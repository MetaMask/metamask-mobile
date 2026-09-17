import { Platform } from 'react-native';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import {
  NeoBankService,
  NeoBankServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';
import { neoBankServiceInit } from './neo-bank-service-init';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/ramps-controller', () => {
  const actualRampsController = jest.requireActual(
    '@metamask/ramps-controller',
  );

  return {
    RampsEnvironment: actualRampsController.RampsEnvironment,
    NeoBankService: jest.fn(),
  };
});

describe('neoBankServiceInit', () => {
  const neoBankServiceClassMock = jest.mocked(NeoBankService);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<NeoBankServiceMessenger>
  >;
  const originalEnv = process.env.METAMASK_ENVIRONMENT;
  const originalOS = Platform.OS;
  const originalRampsEnvironment = process.env.RAMPS_ENVIRONMENT;

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.RAMPS_ENVIRONMENT;
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildMessengerClientInitRequestMock(
      baseControllerMessenger,
    );
  });

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
    Platform.OS = originalOS;
    if (originalRampsEnvironment !== undefined) {
      process.env.RAMPS_ENVIRONMENT = originalRampsEnvironment;
    } else {
      delete process.env.RAMPS_ENVIRONMENT;
    }
  });

  it('returns service instance', () => {
    expect(neoBankServiceInit(initRequestMock).controller).toBeInstanceOf(
      NeoBankService,
    );
  });

  it('passes the proper arguments to the service', () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    Platform.OS = 'ios';
    neoBankServiceInit(initRequestMock);

    expect(neoBankServiceClassMock).toHaveBeenCalledWith({
      messenger: initRequestMock.controllerMessenger,
      environment: RampsEnvironment.Development,
      context: 'mobile-ios',
      fetch,
    });
  });
});
