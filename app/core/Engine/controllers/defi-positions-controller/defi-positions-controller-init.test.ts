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
import { MetaMetrics } from '../../../Analytics';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

jest.mock('.../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

function getInitRequestMock(
  baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  ControllerInitRequest<
    DeFiPositionsControllerMessenger,
    DeFiPositionsControllerInitMessenger
  >
> {
  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getDeFiPositionsControllerMessenger(baseMessenger),
    initMessenger: getDeFiPositionsControllerInitMessenger(baseMessenger),
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
    it('calls the MetaMetrics `trackEvent` function', () => {
      defiPositionsControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(DeFiPositionsController);
      const trackEvent = controllerMock.mock.calls[0][0].trackEvent;

      const instance = MetaMetrics.getInstance();
      const spy = jest.spyOn(instance, 'trackEvent');

      trackEvent?.({
        event: 'test-event',
        category: 'test-category',
        properties: {
          totalPositions: 1,
          totalMarketValueUSD: 100,
        },
      });

      expect(spy).toHaveBeenCalledWith(
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
