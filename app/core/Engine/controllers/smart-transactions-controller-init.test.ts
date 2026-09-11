import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getSmartTransactionsControllerMessenger,
  getSmartTransactionsControllerInitMessenger,
} from '../messengers/smart-transactions-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { smartTransactionsControllerInit } from './smart-transactions-controller-init';
import {
  SmartTransactionsController,
  SmartTransactionsControllerMessenger,
} from '@metamask/smart-transactions-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { setSentinelApiAuth } from '../../../util/transactions/sentinel-api';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';

jest.mock('@metamask/smart-transactions-controller');
jest.mock('../../../util/transactions/sentinel-api');
jest.mock('../../../util/analytics/AnalyticsEventBuilder');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    SmartTransactionsControllerMessenger,
    ReturnType<typeof getSmartTransactionsControllerInitMessenger>
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getSmartTransactionsControllerMessenger(baseMessenger),
    initMessenger: getSmartTransactionsControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('SmartTransactionsControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } =
      smartTransactionsControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SmartTransactionsController);
  });

  it('passes the proper arguments to the controller', () => {
    smartTransactionsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SmartTransactionsController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      supportedChainIds: expect.any(Array),
      clientId: 'mobile',
      getMetaMetricsProps: expect.any(Function),
      trackMetaMetricsEvent: expect.any(Function),
      trace: expect.any(Function),
    });
  });

  describe('trackMetaMetricsEvent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
        addProperties: jest.fn().mockReturnThis(),
        addSensitiveProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({
          name: 'smart_transaction_submitted',
          properties: { chain_id: '1' },
          sensitiveProperties: { tx_hash: '0xabc' },
        }),
      });
    });

    it('calls AnalyticsController:trackEvent via initMessenger', () => {
      const request = getInitRequestMock();
      const initCallSpy = jest.spyOn(request.initMessenger, 'call');

      smartTransactionsControllerInit(request);

      const controllerMock = jest.mocked(SmartTransactionsController);
      const trackMetaMetricsEvent =
        controllerMock.mock.calls[0][0].trackMetaMetricsEvent;

      trackMetaMetricsEvent?.({
        event: 'smart_transaction_submitted',
        category: 'Transactions',
      } as unknown as Parameters<NonNullable<typeof trackMetaMetricsEvent>>[0]);

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'smart_transaction_submitted',
      );
      expect(initCallSpy).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'smart_transaction_submitted',
          properties: { chain_id: '1' },
          sensitiveProperties: { tx_hash: '0xabc' },
        }),
      );
    });
  });

  describe('sentinel API auth', () => {
    const mockSetSentinelApiAuth = jest.mocked(setSentinelApiAuth);

    beforeEach(() => {
      mockSetSentinelApiAuth.mockClear();
    });

    it('configures sentinel API auth that returns token when AuthenticationController returns one', async () => {
      const bearerToken = 'test-bearer-token';
      const request = getInitRequestMock();
      const mockCall = jest.fn().mockResolvedValue(bearerToken);
      jest
        .spyOn(request.controllerMessenger, 'call')
        .mockImplementation(mockCall);

      smartTransactionsControllerInit(request);

      expect(mockSetSentinelApiAuth).toHaveBeenCalledWith(expect.any(Function));
      const sentinelGetter = mockSetSentinelApiAuth.mock.calls[0][0] as (
        ...args: unknown[]
      ) => Promise<string | undefined>;
      const result = await sentinelGetter();

      expect(result).toBe(bearerToken);
      expect(mockCall).toHaveBeenCalledWith(
        'AuthenticationController:getBearerToken',
      );
    });

    it('configures sentinel API auth that returns undefined when AuthenticationController returns undefined', async () => {
      const request = getInitRequestMock();
      const mockCall = jest.fn().mockResolvedValue(undefined);
      jest
        .spyOn(request.controllerMessenger, 'call')
        .mockImplementation(mockCall);

      smartTransactionsControllerInit(request);

      const sentinelGetter = mockSetSentinelApiAuth.mock.calls[0][0] as (
        ...args: unknown[]
      ) => Promise<string | undefined>;
      const result = await sentinelGetter();

      expect(result).toBeUndefined();
    });

    it('configures sentinel API auth that returns undefined when AuthenticationController throws', async () => {
      const request = getInitRequestMock();
      const mockCall = jest.fn().mockRejectedValue(new Error('auth error'));
      jest
        .spyOn(request.controllerMessenger, 'call')
        .mockImplementation(mockCall);

      smartTransactionsControllerInit(request);

      const sentinelGetter = mockSetSentinelApiAuth.mock.calls[0][0] as (
        ...args: unknown[]
      ) => Promise<string | undefined>;
      const result = await sentinelGetter();

      expect(result).toBeUndefined();
    });
  });
});
