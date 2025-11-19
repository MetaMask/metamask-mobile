import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  AnalyticsController,
  type AnalyticsControllerMessenger,
  type AnalyticsControllerState,
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
  });

  it('returns controller instance', () => {
    const result = analyticsControllerInit(initRequestMock);

    expect(result.controller).toBeDefined();
    expect(result.controller).toHaveProperty('identify');
    expect(analyticsControllerClassMock).toHaveBeenCalledTimes(1);
  });

  it('initializes controller without state when no persisted state provided', () => {
    initRequestMock.persistedState = {};

    analyticsControllerInit(initRequestMock);

    const callArgs = analyticsControllerClassMock.mock.calls[0][0];
    expect(callArgs).toHaveProperty('messenger');
    expect(callArgs).toHaveProperty('platformAdapter');
    expect(callArgs).not.toHaveProperty('state');
  });

  it('uses custom state when provided', () => {
    // state not similar to default state from mock analytics controller
    const customState: AnalyticsControllerState = {
      optedInForRegularAccount: false,
      optedInForSocialAccount: true,
      analyticsId: 'dcc3154e-7440-4b18-81b6-d5cd1abd7a6b',
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      AnalyticsController: customState,
    };

    analyticsControllerInit(initRequestMock);

    expect(analyticsControllerClassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: customState,
      }),
    );
  });
});
