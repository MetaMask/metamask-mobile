import { ChompApiService } from '@metamask/chomp-api-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getChompApiServiceInitMessenger,
  getChompApiServiceMessenger,
} from '../messengers/chomp-api-service-messenger';
import { chompApiServiceInit } from './chomp-api-service-init';
import Logger from '../../../util/Logger';

jest.mock('@metamask/chomp-api-service');

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

function getInitRequestMock({
  remoteFeatureFlags,
}: {
  remoteFeatureFlags: Record<string, unknown>;
}) {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on the mock messenger namespace.
    'RemoteFeatureFlagController:getState',
    jest.fn().mockReturnValue({ remoteFeatureFlags }),
  );

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getChompApiServiceMessenger(baseMessenger),
    initMessenger: getChompApiServiceInitMessenger(baseMessenger),
  };
}

describe('chompApiServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a ChompApiService instance', () => {
    const { controller } = chompApiServiceInit(
      getInitRequestMock({
        remoteFeatureFlags: {
          earnChompApiConfig: { baseUrl: 'https://chomp.example.com' },
        },
      }),
    );

    expect(controller).toBeInstanceOf(ChompApiService);
  });

  it('passes the configured base URL when the feature flag is hydrated', () => {
    chompApiServiceInit(
      getInitRequestMock({
        remoteFeatureFlags: {
          earnChompApiConfig: { baseUrl: 'https://chomp.example.com' },
        },
      }),
    );

    expect(jest.mocked(ChompApiService)).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      baseUrl: 'https://chomp.example.com',
    });
  });

  it('falls back to the dev URL and logs when the feature flag is missing', () => {
    chompApiServiceInit(getInitRequestMock({ remoteFeatureFlags: {} }));

    expect(jest.mocked(ChompApiService)).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      baseUrl: 'https://chomp.dev-api.cx.metamask.io',
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[ChompApiServiceInit]',
      'chompApiConfig feature flag not set; falling back to dev URL',
      { fallback: 'https://chomp.dev-api.cx.metamask.io' },
    );
  });

  describe('when MM_DEV_API_ENV=dev', () => {
    beforeEach(() => {
      process.env.MM_DEV_API_ENV = 'dev';
    });

    afterEach(() => {
      delete process.env.MM_DEV_API_ENV;
    });

    it('uses the dev URL even when the remote feature flag points elsewhere', () => {
      chompApiServiceInit(
        getInitRequestMock({
          remoteFeatureFlags: {
            earnChompApiConfig: { baseUrl: 'https://chomp.example.com' },
          },
        }),
      );

      expect(jest.mocked(ChompApiService)).toHaveBeenCalledWith({
        messenger: expect.any(Object),
        baseUrl: 'https://chomp.dev-api.cx.metamask.io',
      });
    });
  });
});
