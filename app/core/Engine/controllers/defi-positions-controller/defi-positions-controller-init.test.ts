import { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  DeFiPositionsControllerInitMessenger,
  getDeFiPositionsControllerMessenger,
} from '../../messengers/defi-positions-controller-messenger/defi-positions-controller-messenger';
import {
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
} from '@metamask/assets-controllers';
import { defiPositionsControllerInit } from './defi-positions-controller-init';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectDefiControllerV2Enabled } from '../../../../selectors/featureFlagController/defiControllerV2';

jest.mock('@metamask/assets-controllers');
jest.mock('../../../../util/analytics/AnalyticsEventBuilder');

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));
jest.mock('../../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));
jest.mock(
  '../../../../selectors/featureFlagController/defiControllerV2',
  () => ({
    selectDefiControllerV2Enabled: jest.fn(),
  }),
);

function getInitRequestMock(
  baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  MessengerClientInitRequest<
    DeFiPositionsControllerMessenger,
    DeFiPositionsControllerInitMessenger
  >
> {
  const mockInitMessenger = {
    call: jest.fn(),
  } as unknown as DeFiPositionsControllerInitMessenger;

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getDeFiPositionsControllerMessenger(baseMessenger),
    initMessenger: mockInitMessenger,
  };

  return requestMock;
}

describe('DeFiPositionsControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (store.getState as jest.Mock).mockReturnValue({});
    (selectBasicFunctionalityEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );
    (selectDefiControllerV2Enabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        name: 'test-event',
        properties: { totalPositions: 1, totalMarketValueUSD: 100 },
      }),
    });
  });

  it('returns controller instance', () => {
    const { controller } = defiPositionsControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(DeFiPositionsController);
  });

  it('passes the proper arguments to the controller', () => {
    defiPositionsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(DeFiPositionsController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      isEnabled: expect.any(Function),
      trackEvent: expect.any(Function),
    });
  });

  describe('isEnabled', () => {
    it.each([
      {
        basicFunctionality: true,
        v2Enabled: false,
        expected: true,
      },
      {
        basicFunctionality: true,
        v2Enabled: true,
        expected: false,
      },
      {
        basicFunctionality: false,
        v2Enabled: false,
        expected: false,
      },
      {
        basicFunctionality: false,
        v2Enabled: true,
        expected: false,
      },
    ])(
      'returns $expected when basicFunctionality=$basicFunctionality, v2Enabled=$v2Enabled',
      ({ basicFunctionality, v2Enabled, expected }) => {
        (
          selectBasicFunctionalityEnabled as unknown as jest.Mock
        ).mockReturnValue(basicFunctionality);
        (selectDefiControllerV2Enabled as unknown as jest.Mock).mockReturnValue(
          v2Enabled,
        );

        defiPositionsControllerInit(getInitRequestMock());

        const controllerMock = jest.mocked(DeFiPositionsController);
        const isEnabled = controllerMock.mock.calls[0][0].isEnabled;

        expect(isEnabled?.()).toBe(expected);
      },
    );
  });

  describe('trackEvent', () => {
    it('calls AnalyticsController:trackEvent via initMessenger', () => {
      const requestMock = getInitRequestMock();
      defiPositionsControllerInit(requestMock);

      const controllerMock = jest.mocked(DeFiPositionsController);
      const trackEvent = controllerMock.mock.calls[0][0].trackEvent;

      trackEvent?.({
        event: 'test-event',
        category: 'test-category',
        properties: {
          totalPositions: 1,
          totalMarketValueUSD: 100,
        },
      });

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'test-event',
      );
      expect(requestMock.initMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'test-event',
          properties: { totalPositions: 1, totalMarketValueUSD: 100 },
        }),
      );
    });
  });
});
