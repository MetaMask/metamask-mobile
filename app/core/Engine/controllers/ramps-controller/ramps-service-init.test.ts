import { Platform } from 'react-native';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
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
import { getBaseSemVerVersion } from '../../../../util/version';

jest.mock('@metamask/ramps-controller', () => {
  const actualRampsController = jest.requireActual(
    '@metamask/ramps-controller',
  );

  return {
    RampsEnvironment: actualRampsController.RampsEnvironment,
    RampsService: jest.fn(),
  };
});

jest.mock('../../../../util/version', () => ({
  getBaseSemVerVersion: jest.fn(() => '8.9.0'),
}));

describe('getRampsEnvironment', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;
  const originalApiEnv = process.env.MM_API_ENV;

  beforeEach(() => {
    delete process.env.MM_API_ENV;
  });

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
  });

  describe('when MM_API_ENV is set', () => {
    it('returns Development when MM_API_ENV is dev', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.MM_API_ENV = 'dev';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Development);
    });

    it('returns Staging when MM_API_ENV is uat', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.MM_API_ENV = 'uat';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });

    it('returns Production when MM_API_ENV is prod', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      process.env.MM_API_ENV = 'prod';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
    });
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

  describe('Development Environment', () => {
    it('returns Development for dev environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Development);
    });
  });

  describe('Staging Environment', () => {
    it('returns Staging for exp environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Staging);
    });
  });

  describe('Default/Unknown Environment', () => {
    it.each(['test', 'e2e', 'unknown'])(
      'returns Production for %s environment',
      (env) => {
        process.env.METAMASK_ENVIRONMENT = env;
        expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
      },
    );

    it('returns Production for undefined environment', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
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
    MessengerClientInitRequest<RampsServiceMessenger>
  >;
  const originalEnv = process.env.METAMASK_ENVIRONMENT;
  const originalOS = Platform.OS;
  const originalApiEnv = process.env.MM_API_ENV;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getBaseSemVerVersion).mockReturnValue('8.9.0');
    delete process.env.MM_API_ENV;
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
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
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
      clientProduct: 'metamask-mobile',
      clientVersion: '8.9.0',
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

    it('passes Development environment for dev environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Development,
        }),
      );
    });

    it('passes Production environment for test environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Production,
        }),
      );
    });

    it('passes Production environment for undefined environment', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Production,
        }),
      );
    });

    it('passes Staging environment when MM_API_ENV is uat', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.MM_API_ENV = 'uat';
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
        clientProduct: 'metamask-mobile',
        clientVersion: '8.9.0',
      });
    });

    it('passes correct environment and context for Android in development', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      Platform.OS = 'android';
      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith({
        messenger: initRequestMock.controllerMessenger,
        environment: RampsEnvironment.Development,
        context: 'mobile-android',
        fetch,
        clientProduct: 'metamask-mobile',
        clientVersion: '8.9.0',
      });
    });
  });
});
