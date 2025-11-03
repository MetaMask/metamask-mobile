import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  AnalyticsController,
  type AnalyticsControllerMessenger,
  getDefaultAnalyticsControllerState,
  type AnalyticsControllerState,
} from '@metamask/analytics-controller';
import { analyticsControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/analytics-controller', () => {
  const actualAnalyticsController = jest.requireActual(
    '@metamask/analytics-controller',
  );

  return {
    ...actualAnalyticsController,
    AnalyticsController: jest.fn(),
  };
});

const mockPlatformAdapter = {
  trackEvent: jest.fn(),
  identify: jest.fn(),
  trackPage: jest.fn(),
};

jest.mock('./platform-adapter', () => ({
  createPlatformAdapter: jest.fn(() => mockPlatformAdapter),
}));

describe('analyticsControllerInit', () => {
  const analyticsControllerClassMock = jest.mocked(AnalyticsController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<AnalyticsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    analyticsControllerClassMock.mockImplementation((options) => ({
        state: options.state,
        messenger: options.messenger,
        platformAdapter: options.platformAdapter,
      } as unknown as AnalyticsController));

    const result = analyticsControllerInit(initRequestMock);

    expect(result.controller).toBeDefined();
  });

  it('uses default state when no persisted state is provided', () => {
    const defaultState = getDefaultAnalyticsControllerState();

    analyticsControllerInit(initRequestMock);

    expect(analyticsControllerClassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: defaultState,
      }),
    );
  });

  it('uses persisted state when provided', () => {
    const persistedState: AnalyticsControllerState = {
      enabled: false,
      optedIn: true,
      analyticsId: 'test-analytics-id',
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      AnalyticsController: persistedState,
    };

    analyticsControllerInit(initRequestMock);

    expect(analyticsControllerClassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: persistedState,
      }),
    );
  });
});
