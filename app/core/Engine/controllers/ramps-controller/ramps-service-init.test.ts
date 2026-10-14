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
  const originalApiEnv = process.env.MM_API_ENV;

  afterEach(() => {
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
  });

  it.each([
    ['dev', RampsEnvironment.Development],
    ['uat', RampsEnvironment.Staging],
    ['prod', RampsEnvironment.Production],
  ] as const)('maps MM_API_ENV=%s to %s', (apiEnv, expected) => {
    process.env.MM_API_ENV = apiEnv;

    expect(getRampsEnvironment()).toBe(expected);
  });

  it('returns Production when MM_API_ENV is unset', () => {
    delete process.env.MM_API_ENV;

    expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
  });

  it('returns Production for an unrecognized MM_API_ENV', () => {
    process.env.MM_API_ENV = 'unknown';

    expect(getRampsEnvironment()).toBe(RampsEnvironment.Production);
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
    it.each([
      ['dev', RampsEnvironment.Development],
      ['uat', RampsEnvironment.Staging],
      ['prod', RampsEnvironment.Production],
    ] as const)('passes %s as %s to the service', (apiEnv, expected) => {
      process.env.MM_API_ENV = apiEnv;

      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({ environment: expected }),
      );
    });

    it('passes Production when MM_API_ENV is unset', () => {
      delete process.env.MM_API_ENV;

      rampsServiceInit(initRequestMock);

      expect(rampsServiceClassMock).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: RampsEnvironment.Production,
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
      process.env.MM_API_ENV = 'prod';
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
      process.env.MM_API_ENV = 'dev';
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
