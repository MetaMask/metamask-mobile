import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  AnalyticsController,
  type AnalyticsControllerMessenger,
} from '@metamask/analytics-controller';
import { analyticsControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/analytics-controller');

const mockPlatformAdapter = {
  track: jest.fn(),
  identify: jest.fn(),
  view: jest.fn(),
  onSetupCompleted: jest.fn(),
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
    jest.clearAllMocks();
    analyticsControllerClassMock.mockReset();
    analyticsControllerClassMock.mockImplementation(
      () =>
        ({
          identify: jest.fn(),
        }) as unknown as AnalyticsController,
    );
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
    initRequestMock.analyticsDefaults = {
      analyticsId: 'test-analytics-id',
      optedInForRegularAccount: false,
      optedInForSocialAccount: false,
    };
  });

  it('returns controller instance', () => {
    const result = analyticsControllerInit(initRequestMock);

    expect(result.controller).toBeDefined();
    expect(result.controller).toHaveProperty('identify');
    expect(analyticsControllerClassMock).toHaveBeenCalledTimes(1);
  });

  it('initializes controller with analyticsDefaults from request', () => {
    initRequestMock.analyticsDefaults = {
      analyticsId: 'test-analytics-id',
      optedInForRegularAccount: true,
      optedInForSocialAccount: false,
    };

    analyticsControllerInit(initRequestMock);

    const callArgs = analyticsControllerClassMock.mock.calls[0][0];
    expect(callArgs).toHaveProperty('messenger');
    expect(callArgs).toHaveProperty('platformAdapter');
    expect(callArgs).toHaveProperty('state');
    expect(callArgs.state).toEqual({
      analyticsId: 'test-analytics-id',
      optedInForRegularAccount: true,
      optedInForSocialAccount: false,
    });
  });

  it('uses analyticsDefaults values from request', () => {
    initRequestMock.analyticsDefaults = {
      analyticsId: 'another-test-id',
      optedInForRegularAccount: false,
      optedInForSocialAccount: true,
    };

    analyticsControllerInit(initRequestMock);

    const callArgs = analyticsControllerClassMock.mock.calls[0][0];
    expect(callArgs.state).toEqual({
      analyticsId: 'another-test-id',
      optedInForRegularAccount: false,
      optedInForSocialAccount: true,
    });
  });
});
