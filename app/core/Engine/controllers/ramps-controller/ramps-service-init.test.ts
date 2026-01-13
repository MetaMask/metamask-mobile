import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';
import { rampsServiceInit, getRampsEnvironment } from './ramps-service-init';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/ramps-controller', () => {
  const actualRampsController = jest.requireActual(
    '@metamask/ramps-controller',
  );

  return {
    RampsEnvironment: actualRampsController.RampsEnvironment,
    RampsService: jest.fn(),
  };
});

describe('getRampsEnvironment', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  describe('Production Environment', () => {
    it('returns Production for production environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
    });

    it('returns Production for beta environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
    });

    it('returns Production for rc environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
    });
  });

  describe('Staging Environment', () => {
    it('returns Staging for dev environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });

    it('returns Staging for exp environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });

    it('returns Staging for test environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });

    it('returns Staging for e2e environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });
  });

  describe('Default/Unknown Environment', () => {
    it('returns Staging for undefined environment', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });

    it('returns Staging for unknown environment value', () => {
      process.env.METAMASK_ENVIRONMENT = 'unknown';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });
  });
});

describe('rampsServiceInit', () => {
  const rampsServiceClassMock = jest.mocked(RampsService);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RampsServiceMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns service instance', () => {
    expect(rampsServiceInit(initRequestMock).controller).toBeInstanceOf(
      RampsService,
    );
  });

  it('passes the proper arguments to the service', () => {
    rampsServiceInit(initRequestMock);

    expect(rampsServiceClassMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      environment: expect.any(String),
      context: expect.any(String),
      fetch,
    });
  });
});
