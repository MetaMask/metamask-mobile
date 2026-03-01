import { Platform } from 'react-native';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';
import {
  rampsServiceInit,
  getRampsEnvironment,
  getRampsContext,
} from './ramps-service-init';
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

describe('getRampsContext', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('returns mobile-ios for iOS platform', () => {
    Platform.OS = 'ios';
    expect(getRampsContext()).toBe('mobile-ios');
  });

  it('returns mobile-android for Android platform', () => {
    Platform.OS = 'android';
    expect(getRampsContext()).toBe('mobile-android');
  });
});

describe('rampsServiceInit', () => {
  const rampsServiceClassMock = jest.mocked(RampsService);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RampsServiceMessenger>
  >;
  const originalEnv = process.env.METAMASK_ENVIRONMENT;
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
    Platform.OS = originalOS;
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

  it('passes the correct messenger to the service', () => {
    rampsServiceInit(initRequestMock);

    expect(rampsServiceClassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: initRequestMock.controllerMessenger,
      }),
    );
  });

  it('passes the correct fetch function to the service', () => {
    rampsServiceInit(initRequestMock);

    expect(rampsServiceClassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fetch,
      }),
    );
  });

  describe('environment configuration', () => {
    it('passes Production environment for production environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Production,
        }),
      );
    });

    it('passes Production environment for beta environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Production,
        }),
      );
    });

    it('passes Production environment for rc environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Production,
        }),
      );
    });

    it('passes Staging environment for dev environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Staging,
        }),
      );
    });

    it('passes Staging environment for test environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Staging,
        }),
      );
    });

    it('passes Staging environment for undefined environment', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Staging,
        }),
      );
    });
  });

  describe('context configuration', () => {
    it('passes mobile-ios context for iOS platform', () => {
      Platform.OS = 'ios';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'mobile-ios',
        }),
      );
    });

    it('passes mobile-android context for Android platform', () => {
      Platform.OS = 'android';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'mobile-android',
        }),
      );
    });

    it('covers both branches of getRampsContext ternary when called from rampsServiceInit', () => {
      Platform.OS = 'ios';
      rampsServiceInit(initRequestMock);
      const iosCall =
        rampsServiceClassMock.mock.calls[
          rampsServiceClassMock.mock.calls.length - 1
        ];
      expect(iosCall[0].context).toBe('mobile-ios');

      Platform.OS = 'android';
      rampsServiceInit(initRequestMock);
      const androidCall =
        rampsServiceClassMock.mock.calls[
          rampsServiceClassMock.mock.calls.length - 1
        ];
      expect(androidCall[0].context).toBe('mobile-android');
    });
  });

  describe('integration with environment and platform', () => {
    it('passes correct environment and context for iOS in production', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      Platform.OS = 'ios';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith({
        messenger: initRequestMock.controllerMessenger,
        environment: RampsEnvironment.Production,
        context: 'mobile-ios',
        fetch,
      });
    });

    it('passes correct environment and context for Android in staging', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      Platform.OS = 'android';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith({
        messenger: initRequestMock.controllerMessenger,
        environment: RampsEnvironment.Staging,
        context: 'mobile-android',
        fetch,
      });
    });
  });
});
