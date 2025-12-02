import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getAuthenticationControllerInitMessenger,
  getAuthenticationControllerMessenger,
} from '../../messengers/identity/authentication-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { authenticationControllerInit } from './authentication-controller-init';
import {
  Controller as AuthenticationController,
  AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { selectAnalyticsId } from '../../../../selectors/analyticsController';

jest.mock('@metamask/profile-sync-controller/auth');
jest.mock('../../../../selectors/analyticsController', () => ({
  selectAnalyticsId: jest.fn(),
}));

const mockSelectAnalyticsId = selectAnalyticsId as jest.MockedFunction<
  typeof selectAnalyticsId
>;

function getInitRequestMock(
  baseMessenger?: ExtendedMessenger<MockAnyNamespace>,
): jest.Mocked<
  ControllerInitRequest<
    AuthenticationControllerMessenger,
    ReturnType<typeof getAuthenticationControllerInitMessenger>
  >
> {
  const messenger =
    baseMessenger ||
    new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

  const baseRequest = buildControllerInitRequestMock(messenger);
  const requestMock = {
    ...baseRequest,
    controllerMessenger: getAuthenticationControllerMessenger(messenger),
    initMessenger: getAuthenticationControllerInitMessenger(messenger),
  };

  return requestMock;
}

describe('AuthenticationControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    mockSelectAnalyticsId.mockReturnValue(
      'f2673eb8-db32-40bb-88a5-97cf5107d31d',
    );
    const { controller } = authenticationControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(AuthenticationController);
  });

  it('passes the proper arguments to the controller', () => {
    mockSelectAnalyticsId.mockReturnValue(
      'f2673eb8-db32-40bb-88a5-97cf5107d31d',
    );
    const requestMock = getInitRequestMock();
    authenticationControllerInit(requestMock);

    const controllerMock = jest.mocked(AuthenticationController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      metametrics: {
        agent: 'mobile',
        getMetaMetricsId: expect.any(Function),
      },
    });
  });

  it('getMetaMetricsId returns analytics ID from selector', async () => {
    const expectedAnalyticsId = 'f2673eb8-db32-40bb-88a5-97cf5107d31d';
    mockSelectAnalyticsId.mockReturnValue(expectedAnalyticsId);

    const requestMock = getInitRequestMock();
    authenticationControllerInit(requestMock);

    const controllerMock = jest.mocked(AuthenticationController);
    const getMetaMetricsId =
      controllerMock.mock.calls[0][0].metametrics.getMetaMetricsId;

    const analyticsId = await getMetaMetricsId();

    expect(mockSelectAnalyticsId).toHaveBeenCalled();
    expect(analyticsId).toBe(expectedAnalyticsId);
  });

  it('getMetaMetricsId returns empty string when analytics ID is undefined', async () => {
    mockSelectAnalyticsId.mockReturnValue(undefined);

    const requestMock = getInitRequestMock();
    authenticationControllerInit(requestMock);

    const controllerMock = jest.mocked(AuthenticationController);
    const getMetaMetricsId =
      controllerMock.mock.calls[0][0].metametrics.getMetaMetricsId;

    const analyticsId = await getMetaMetricsId();

    expect(mockSelectAnalyticsId).toHaveBeenCalled();
    expect(analyticsId).toBe('');
  });
});
