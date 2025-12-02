import { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  DeFiPositionsControllerInitMessenger,
  getDeFiPositionsControllerInitMessenger,
  getDeFiPositionsControllerMessenger,
} from '../../messengers/defi-positions-controller-messenger/defi-positions-controller-messenger';
import {
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
} from '@metamask/assets-controllers';
import { defiPositionsControllerInit } from './defi-positions-controller-init';
import { AnalyticsEventBuilder } from '../../../Analytics/AnalyticsEventBuilder';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../Analytics/AnalyticsEventBuilder');

jest.mock('@metamask/assets-controllers');

jest.mock('.../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

function getInitRequestMock(
  baseMessenger?: ExtendedMessenger<MockAnyNamespace>,
): jest.Mocked<
  ControllerInitRequest<
    DeFiPositionsControllerMessenger,
    DeFiPositionsControllerInitMessenger
  >
> {
  const messenger =
    baseMessenger ||
    new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

  // Register AnalyticsController action handlers in the base messenger if not already registered
  if (!baseMessenger) {
    messenger.registerActionHandler(
      // @ts-expect-error: Action not allowed in base messenger type
      'AnalyticsController:trackEvent',
      jest.fn().mockResolvedValue(undefined),
    );
  }

  const requestMock = {
    ...buildControllerInitRequestMock(messenger),
    controllerMessenger: getDeFiPositionsControllerMessenger(messenger),
    initMessenger: getDeFiPositionsControllerInitMessenger(messenger),
  };

  return requestMock;
}

describe('DeFiPositionsControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('trackEvent', () => {
    it('calls AnalyticsController via initMessenger', () => {
      const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
        namespace: MOCK_ANY_NAMESPACE,
      });
      const trackEventHandler = jest.fn().mockResolvedValue(undefined);
      baseMessenger.registerActionHandler(
        // @ts-expect-error: Action not allowed in base messenger type
        'AnalyticsController:trackEvent',
        trackEventHandler,
      );

      const requestMock = getInitRequestMock(baseMessenger);
      defiPositionsControllerInit(requestMock);

      const controllerMock = jest.mocked(DeFiPositionsController);
      const trackEvent = controllerMock.mock.calls[0][0].trackEvent;

      const mockEventBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({
          name: 'test-event',
          properties: { totalPositions: 1, totalMarketValueUSD: 100 },
          sensitiveProperties: {},
        }),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockEventBuilder,
      );

      trackEvent?.({
        event: 'test-event',
        properties: {
          totalPositions: 1,
          totalMarketValueUSD: 100,
        },
      });

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'test-event',
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        totalPositions: 1,
        totalMarketValueUSD: 100,
      });
      expect(trackEventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-event',
          properties: {
            totalPositions: 1,
            totalMarketValueUSD: 100,
          },
        }),
      );
    });
  });
});
